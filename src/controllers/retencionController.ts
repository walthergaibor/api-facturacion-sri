import type { NextFunction, Request, Response } from 'express';

import { getComprobanteService } from '../services/sri/comprobanteService.js';

type RetencionService = {
  emitirRetencion: (input: { empresaId: string; data: Record<string, unknown> }) => Promise<unknown>;
};

export function createRetencionController(service: RetencionService) {
  return {
    createRetencion: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.empresaId) {
          res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Empresa no autenticada'
            }
          });
          return;
        }

        const result = await service.emitirRetencion({
          empresaId: req.empresaId,
          data: (req.body ?? {}) as Record<string, unknown>
        });

        res.status(201).json({
          success: true,
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  };
}

let defaultController: ReturnType<typeof createRetencionController> | null = null;

function getDefaultController() {
  if (!defaultController) {
    defaultController = createRetencionController(getComprobanteService());
  }
  return defaultController;
}

export const retencionController = {
  createRetencion(req: Request, res: Response, next: NextFunction) {
    return getDefaultController().createRetencion(req, res, next);
  }
};
