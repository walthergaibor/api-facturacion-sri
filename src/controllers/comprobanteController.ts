import type { NextFunction, Request, Response } from 'express';

import { getPrismaClient } from '../config/prisma.js';
import { getEmailService } from '../services/email/emailService.js';
import { createRideFacturaService } from '../services/ride/rideFactura.js';
import { createRideNotaCreditoService } from '../services/ride/rideNotaCredito.js';
import { createRideRetencionService } from '../services/ride/rideRetencion.js';
import { autorizacionService } from '../services/sri/autorizacion.js';

type PrismaLike = {
  comprobante: {
    findMany: (args: { where: Record<string, unknown>; orderBy?: Record<string, string> }) => Promise<any[]>;
    findFirst: (args: { where: Record<string, unknown> }) => Promise<any | null>;
    update?: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<any>;
  };
  empresa: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; ambiente?: string } | null>;
  };
};

type AutorizacionLike = {
  consultarAutorizacion: (input: { ambiente: string; claveAcceso: string }) => Promise<any>;
};

type RideServicesLike = {
  factura: { generateRideFacturaPdf: (input: any) => Promise<Buffer> };
  notaCredito: { generateRideNotaCreditoPdf: (input: any) => Promise<Buffer> };
  retencion: { generateRideRetencionPdf: (input: any) => Promise<Buffer> };
};

type StorageLike = {
  upload: (path: string, buffer: Buffer) => Promise<void>;
  download: (path: string) => Promise<Buffer>;
};

type EmailServiceLike = {
  sendComprobanteEmail: (input: {
    to: string;
    subject: string;
    text: string;
    pdfBuffer: Buffer;
    xmlContent: string;
    claveAcceso: string;
  }) => Promise<{ id: string }>;
};

type ComprobanteControllerDeps = {
  db: PrismaLike;
  autorizacionService: AutorizacionLike;
  rideServices: RideServicesLike;
  storage: StorageLike;
  emailService: EmailServiceLike;
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

function normalizeStoragePath(path: string): string {
  return path.startsWith('comprobantes/') ? path.slice('comprobantes/'.length) : path;
}

function defaultStorage(): StorageLike {
  return {
    async upload(path: string, buffer: Buffer): Promise<void> {
      const { supabase } = await import('../config/supabase.js');
      const { error } = await supabase.storage.from('comprobantes').upload(path, buffer, {
        upsert: true,
        contentType: 'application/pdf'
      });
      if (error) {
        throw new Error(`No se pudo subir archivo a storage: ${error.message}`);
      }
    },
    async download(path: string): Promise<Buffer> {
      const { supabase } = await import('../config/supabase.js');
      const normalized = normalizeStoragePath(path);
      const { data, error } = await supabase.storage.from('comprobantes').download(normalized);
      if (error || !data) {
        throw new Error(`No se pudo descargar archivo desde storage: ${error?.message ?? 'sin data'}`);
      }
      const bytes = await data.arrayBuffer();
      return Buffer.from(bytes);
    }
  };
}

function buildRidePayload(comprobante: any): any {
  const respuestaSri = comprobante.respuestaSri ?? {};

  return {
    claveAcceso: comprobante.claveAcceso,
    emisor: {
      razonSocial: comprobante.empresa?.razonSocial ?? 'Emisor',
      ruc: comprobante.empresa?.ruc ?? ''
    },
    comprador: {
      razonSocial: comprobante.razonSocialComprador ?? '',
      identificacion: comprobante.identificacionComprador ?? ''
    },
    sujetoRetenido: {
      razonSocial: comprobante.razonSocialComprador ?? '',
      identificacion: comprobante.identificacionComprador ?? ''
    },
    docModificado: {
      numero: respuestaSri?.docModificado?.numero ?? '',
      fechaEmision: respuestaSri?.docModificado?.fechaEmision ?? ''
    },
    motivo: respuestaSri?.motivo ?? '',
    items: respuestaSri?.items ?? [],
    retenciones: respuestaSri?.retenciones ?? [],
    periodoFiscal: respuestaSri?.periodoFiscal ?? '',
    totales: {
      subtotal: String(comprobante.totalSinImpuestos ?? '0.00'),
      impuestos: String(comprobante.totalConImpuestos ?? '0.00'),
      total: String(comprobante.importeTotal ?? '0.00')
    }
  };
}

async function resolveRidePdf(
  deps: ComprobanteControllerDeps,
  empresaId: string,
  claveAcceso: string,
  comprobante: any
): Promise<{ pdfBuffer: Buffer; ridePdfPath: string }> {
  if (comprobante.ridePdf) {
    const pdf = await deps.storage.download(comprobante.ridePdf);
    return { pdfBuffer: pdf, ridePdfPath: String(comprobante.ridePdf) };
  }

  const payload = buildRidePayload(comprobante);
  const pdfBuffer =
    comprobante.tipoDocumento === '04'
      ? await deps.rideServices.notaCredito.generateRideNotaCreditoPdf(payload)
      : comprobante.tipoDocumento === '07'
        ? await deps.rideServices.retencion.generateRideRetencionPdf(payload)
        : await deps.rideServices.factura.generateRideFacturaPdf(payload);

  const storagePath = `${empresaId}/${comprobante.tipoDocumento}/${claveAcceso}/ride.pdf`;
  await deps.storage.upload(storagePath, pdfBuffer);

  if (typeof deps.db.comprobante.update === 'function') {
    await deps.db.comprobante.update({
      where: { id: comprobante.id },
      data: { ridePdf: `comprobantes/${storagePath}` }
    });
  }

  return { pdfBuffer, ridePdfPath: `comprobantes/${storagePath}` };
}

export function createComprobanteController(customDeps: Partial<ComprobanteControllerDeps> = {}) {
  let lazyEmailService: EmailServiceLike | null = null;
  const getLazyEmailService = (): EmailServiceLike => {
    if (!lazyEmailService) {
      lazyEmailService = getEmailService();
    }
    return lazyEmailService;
  };

  const deps: ComprobanteControllerDeps = {
    db: (customDeps.db ?? (getPrismaClient() as any)) as PrismaLike,
    autorizacionService: customDeps.autorizacionService ?? autorizacionService,
    rideServices: customDeps.rideServices ?? {
      factura: createRideFacturaService(),
      notaCredito: createRideNotaCreditoService(),
      retencion: createRideRetencionService()
    },
    storage: customDeps.storage ?? defaultStorage(),
    emailService:
      customDeps.emailService ??
      ({
        sendComprobanteEmail: async (input) => getLazyEmailService().sendComprobanteEmail(input)
      } as EmailServiceLike)
  };

  return {
    listComprobantes: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.empresaId) {
          unauthorized(res);
          return;
        }

        const where: Record<string, unknown> = { empresaId: req.empresaId };
        if (typeof req.query.estado === 'string' && req.query.estado.trim()) where.estado = req.query.estado;
        if (typeof req.query.tipoDocumento === 'string' && req.query.tipoDocumento.trim()) where.tipoDocumento = req.query.tipoDocumento;

        const comprobantes = await deps.db.comprobante.findMany({ where, orderBy: { createdAt: 'desc' } });
        res.status(200).json({ success: true, data: comprobantes });
      } catch (error) {
        next(error);
      }
    },

    getComprobanteByClave: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.empresaId) {
          unauthorized(res);
          return;
        }

        const claveAcceso = String(req.params.claveAcceso ?? '');
        const comprobante = await deps.db.comprobante.findFirst({ where: { empresaId: req.empresaId, claveAcceso } });

        if (!comprobante) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Comprobante no encontrado' } });
          return;
        }

        res.status(200).json({ success: true, data: comprobante });
      } catch (error) {
        next(error);
      }
    },

    consultarAutorizacionSri: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.empresaId) {
          unauthorized(res);
          return;
        }

        const claveAcceso = String(req.params.claveAcceso ?? '');
        const empresa = await deps.db.empresa.findUnique({ where: { id: req.empresaId } });
        const ambiente = empresa?.ambiente ?? '1';

        const resultado = await deps.autorizacionService.consultarAutorizacion({ ambiente, claveAcceso });
        res.status(200).json({ success: true, data: resultado });
      } catch (error) {
        next(error);
      }
    },

    getRidePdf: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.empresaId) {
          unauthorized(res);
          return;
        }

        const claveAcceso = String(req.params.claveAcceso ?? '');
        const comprobante = await deps.db.comprobante.findFirst({ where: { empresaId: req.empresaId, claveAcceso } });

        if (!comprobante) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Comprobante no encontrado' } });
          return;
        }

        const { pdfBuffer } = await resolveRidePdf(deps, req.empresaId, claveAcceso, comprobante);
        res.setHeader('Content-Type', 'application/pdf');
        res.status(200).send(pdfBuffer);
      } catch (error) {
        next(error);
      }
    },

    sendComprobanteEmail: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.empresaId) {
          unauthorized(res);
          return;
        }

        const claveAcceso = String(req.params.claveAcceso ?? '');
        const comprobante = await deps.db.comprobante.findFirst({ where: { empresaId: req.empresaId, claveAcceso } });

        if (!comprobante) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Comprobante no encontrado' } });
          return;
        }

        const to = String(req.body?.email ?? comprobante.emailComprador ?? '').trim();
        if (!to) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'No existe email del comprador, envie body.email' }
          });
          return;
        }

        const { pdfBuffer } = await resolveRidePdf(deps, req.empresaId, claveAcceso, comprobante);

        let xmlContent = '<comprobante />';
        if (comprobante.xmlAutorizado) {
          const xmlBuffer = await deps.storage.download(comprobante.xmlAutorizado);
          xmlContent = xmlBuffer.toString('utf8');
        }

        const result = await deps.emailService.sendComprobanteEmail({
          to,
          subject: `Comprobante Electronico ${claveAcceso}`,
          text: `Adjunto RIDE y XML autorizado del comprobante ${claveAcceso}`,
          pdfBuffer,
          xmlContent,
          claveAcceso
        });

        res.status(200).json({ success: true, data: { id: result.id, to } });
      } catch (error) {
        next(error);
      }
    }
  };
}

let defaultController: ReturnType<typeof createComprobanteController> | null = null;

function getDefaultController() {
  if (!defaultController) {
    defaultController = createComprobanteController();
  }
  return defaultController;
}

export const comprobanteController = {
  listComprobantes(req: Request, res: Response, next: NextFunction) {
    return getDefaultController().listComprobantes(req, res, next);
  },
  getComprobanteByClave(req: Request, res: Response, next: NextFunction) {
    return getDefaultController().getComprobanteByClave(req, res, next);
  },
  consultarAutorizacionSri(req: Request, res: Response, next: NextFunction) {
    return getDefaultController().consultarAutorizacionSri(req, res, next);
  },
  getRidePdf(req: Request, res: Response, next: NextFunction) {
    return getDefaultController().getRidePdf(req, res, next);
  },
  sendComprobanteEmail(req: Request, res: Response, next: NextFunction) {
    return getDefaultController().sendComprobanteEmail(req, res, next);
  }
};
