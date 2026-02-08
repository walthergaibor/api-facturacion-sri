import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { getPrismaClient } from '../config/prisma.js';
import { encrypt } from '../utils/encryption.js';

type CertInfo = {
  titular?: string | null;
  rucTitular?: string | null;
  vigenciaDesde?: Date | null;
  vigenciaHasta?: Date | null;
};

type PrismaLike = {
  empresa: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; ruc: string } | null>;
  };
  firmaElectronica: {
    findFirst: (args: Record<string, unknown>) => Promise<any | null>;
    findMany: (args: Record<string, unknown>) => Promise<any[]>;
    updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
    create: (args: { data: Record<string, unknown> }) => Promise<any>;
  };
};

type FirmaControllerDeps = {
  db: PrismaLike;
  storage: {
    upload: (path: string, content: Buffer) => Promise<void>;
  };
  parseCertificate: (p12Buffer: Buffer, password: string) => Promise<CertInfo>;
  crypto: {
    encrypt: (plain: string) => { encrypted: string; iv: string; authTag: string };
  };
  generateId: () => string;
};

function unauthorized(res: Response): void {
  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Empresa no autenticada'
    }
  });
}

async function defaultUpload(path: string, content: Buffer): Promise<void> {
  const { supabase } = await import('../config/supabase.js');
  const normalized = path.startsWith('firmas/') ? path.slice('firmas/'.length) : path;
  const { error } = await supabase.storage.from('firmas').upload(normalized, content, {
    upsert: true,
    contentType: 'application/x-pkcs12'
  });
  if (error) {
    throw new Error(`No se pudo subir firma a storage: ${error.message}`);
  }
}

async function defaultParseCertificate(p12Buffer: Buffer, password: string): Promise<CertInfo> {
  if (!Buffer.isBuffer(p12Buffer) || p12Buffer.length === 0) {
    throw new Error('Archivo .p12 invalido');
  }
  if (!password || !password.trim()) {
    throw new Error('Contrasena .p12 requerida');
  }

  // Placeholder: validacion minima de presencia; extracción real se conecta en siguiente iteración.
  return {
    titular: null,
    rucTitular: null,
    vigenciaDesde: null,
    vigenciaHasta: null
  };
}

export function createFirmaController(customDeps: Partial<FirmaControllerDeps> = {}) {
  const deps: FirmaControllerDeps = {
    db: (customDeps.db ?? (getPrismaClient() as any)) as PrismaLike,
    storage: customDeps.storage ?? { upload: defaultUpload },
    parseCertificate: customDeps.parseCertificate ?? defaultParseCertificate,
    crypto: customDeps.crypto ?? { encrypt },
    generateId: customDeps.generateId ?? (() => randomUUID())
  };

  return {
    uploadFirma: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.empresaId) {
          unauthorized(res);
          return;
        }

        const p12Password = String(req.body?.p12Password ?? '');
        const p12Buffer = (req as any).file?.buffer as Buffer | undefined;

        if (!p12Buffer) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'p12File es requerido' }
          });
          return;
        }

        if (!p12Password.trim()) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'p12Password es requerido' }
          });
          return;
        }

        const empresa = await deps.db.empresa.findUnique({ where: { id: req.empresaId } });
        if (!empresa) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Empresa no encontrada' } });
          return;
        }

        const certInfo = await deps.parseCertificate(p12Buffer, p12Password);
        if (certInfo.rucTitular && certInfo.rucTitular !== empresa.ruc) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'El RUC del certificado no coincide con la empresa' }
          });
          return;
        }

        await deps.db.firmaElectronica.updateMany({
          where: { empresaId: req.empresaId, activa: true },
          data: { activa: false }
        });

        const firmaId = deps.generateId();
        const storagePath = `firmas/${req.empresaId}/${firmaId}.p12`;
        await deps.storage.upload(storagePath, p12Buffer);

        const enc = deps.crypto.encrypt(p12Password);
        const created = await deps.db.firmaElectronica.create({
          data: {
            id: firmaId,
            empresaId: req.empresaId,
            storagePath,
            p12PasswordEnc: enc.encrypted,
            p12PasswordIv: enc.iv,
            p12PasswordTag: enc.authTag,
            titular: certInfo.titular ?? null,
            rucTitular: certInfo.rucTitular ?? null,
            vigenciaDesde: certInfo.vigenciaDesde ?? null,
            vigenciaHasta: certInfo.vigenciaHasta ?? null,
            activa: true
          }
        });

        res.status(201).json({ success: true, data: created });
      } catch (error) {
        next(error);
      }
    },

    getFirmaEstado: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.empresaId) {
          unauthorized(res);
          return;
        }

        const firma = await deps.db.firmaElectronica.findFirst({
          where: { empresaId: req.empresaId, activa: true },
          orderBy: { createdAt: 'desc' }
        });

        if (!firma) {
          res.status(200).json({ success: true, data: null });
          return;
        }

        const now = Date.now();
        const vigenciaHasta = firma.vigenciaHasta ? new Date(firma.vigenciaHasta).getTime() : null;
        const diasRestantes = vigenciaHasta ? Math.ceil((vigenciaHasta - now) / (1000 * 60 * 60 * 24)) : null;

        res.status(200).json({
          success: true,
          data: {
            ...firma,
            diasRestantes,
            expirada: typeof diasRestantes === 'number' ? diasRestantes < 0 : false
          }
        });
      } catch (error) {
        next(error);
      }
    },

    getFirmaHistorial: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.empresaId) {
          unauthorized(res);
          return;
        }

        const firmas = await deps.db.firmaElectronica.findMany({
          where: { empresaId: req.empresaId },
          orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ success: true, data: firmas });
      } catch (error) {
        next(error);
      }
    }
  };
}

let defaultController: ReturnType<typeof createFirmaController> | null = null;

function getDefaultController() {
  if (!defaultController) {
    defaultController = createFirmaController();
  }
  return defaultController;
}

export const firmaController = {
  uploadFirma(req: Request, res: Response, next: NextFunction) {
    return getDefaultController().uploadFirma(req, res, next);
  },
  getFirmaEstado(req: Request, res: Response, next: NextFunction) {
    return getDefaultController().getFirmaEstado(req, res, next);
  },
  getFirmaHistorial(req: Request, res: Response, next: NextFunction) {
    return getDefaultController().getFirmaHistorial(req, res, next);
  }
};
