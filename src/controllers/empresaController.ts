import type { NextFunction, Request, Response } from 'express';

import { prisma } from '../config/prisma.js';
import { generateApiKey } from '../utils/apiKey.js';

type PrismaLike = {
  empresa: {
    create: (...args: any[]) => Promise<any>;
    findMany: (...args: any[]) => Promise<any[]>;
    findUnique: (...args: any[]) => Promise<any | null>;
    update: (...args: any[]) => Promise<any>;
  };
  apiKey: {
    create: (...args: any[]) => Promise<any>;
  };
};

function notFound(res: Response, entity = 'Empresa'): void {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `${entity} no encontrada` }
  });
}

export function createEmpresaController(db: PrismaLike) {
  return {
    createEmpresa: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const data = req.body ?? {};
        const empresa = await db.empresa.create({
          data: {
            ruc: data.ruc,
            razonSocial: data.razonSocial,
            nombreComercial: data.nombreComercial,
            direccionMatriz: data.direccionMatriz,
            direccionEstablecimiento: data.direccionEstablecimiento,
            codEstablecimiento: data.codEstablecimiento ?? '001',
            ptoEmision: data.ptoEmision ?? '001',
            obligadoContabilidad: data.obligadoContabilidad ?? false,
            contribuyenteEspecial: data.contribuyenteEspecial,
            agenteRetencion: data.agenteRetencion,
            regimenMicroempresas: data.regimenMicroempresas ?? false,
            ambiente: data.ambiente ?? '1',
            tipoEmision: '1',
            activa: true
          }
        });

        const apiKey = generateApiKey();
        await db.apiKey.create({
          data: {
            empresaId: empresa.id,
            key: apiKey,
            nombre: 'Clave inicial',
            permisos: ['factura', 'notaCredito', 'retencion', 'consulta'],
            activa: true
          }
        });

        res.status(201).json({
          success: true,
          data: {
            empresaId: empresa.id,
            apiKey
          }
        });
      } catch (error) {
        next(error);
      }
    },

    listEmpresas: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const empresas = await db.empresa.findMany({
          orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ success: true, data: empresas });
      } catch (error) {
        next(error);
      }
    },

    getEmpresaById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const empresa = await db.empresa.findUnique({ where: { id: req.params.id } });
        if (!empresa) {
          notFound(res);
          return;
        }
        res.status(200).json({ success: true, data: empresa });
      } catch (error) {
        next(error);
      }
    },

    updateEmpresa: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const existing = await db.empresa.findUnique({ where: { id: req.params.id } });
        if (!existing) {
          notFound(res);
          return;
        }

        const empresa = await db.empresa.update({
          where: { id: req.params.id },
          data: req.body
        });

        res.status(200).json({ success: true, data: empresa });
      } catch (error) {
        next(error);
      }
    },

    updateAmbiente: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const ambiente = req.body?.ambiente;
        if (ambiente !== '1' && ambiente !== '2') {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'ambiente debe ser "1" o "2"' }
          });
          return;
        }

        const empresa = await db.empresa.update({
          where: { id: req.params.id },
          data: { ambiente }
        });

        res.status(200).json({ success: true, data: empresa });
      } catch (error) {
        next(error);
      }
    },

    getOwnEmpresa: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.empresaId) {
          res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Empresa no autenticada' }
          });
          return;
        }

        const empresa = await db.empresa.findUnique({ where: { id: req.empresaId } });
        if (!empresa) {
          notFound(res);
          return;
        }

        res.status(200).json({ success: true, data: empresa });
      } catch (error) {
        next(error);
      }
    },

    updateOwnEmpresa: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.empresaId) {
          res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Empresa no autenticada' }
          });
          return;
        }

        const existing = await db.empresa.findUnique({ where: { id: req.empresaId } });
        if (!existing) {
          notFound(res);
          return;
        }

        const allowedFields = [
          'razonSocial',
          'nombreComercial',
          'direccionMatriz',
          'direccionEstablecimiento',
          'obligadoContabilidad',
          'contribuyenteEspecial',
          'agenteRetencion',
          'regimenMicroempresas'
        ];
        const data: Record<string, unknown> = {};
        for (const field of allowedFields) {
          if (field in (req.body ?? {})) {
            data[field] = req.body[field];
          }
        }

        const empresa = await db.empresa.update({
          where: { id: req.empresaId },
          data
        });

        res.status(200).json({ success: true, data: empresa });
      } catch (error) {
        next(error);
      }
    }
  };
}

export const empresaController = createEmpresaController(prisma as unknown as PrismaLike);
