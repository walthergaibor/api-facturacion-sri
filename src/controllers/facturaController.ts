import type { NextFunction, Request, Response } from 'express';

import { getComprobanteService } from '../services/sri/comprobanteService.js';

type FacturaService = {
  emitirFactura: (input: { empresaId: string; data: Record<string, unknown> }) => Promise<unknown>;
};

export function createFacturaController(service: FacturaService) {
  return {
    createFactura: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

        const result = await service.emitirFactura({
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

let defaultController: ReturnType<typeof createFacturaController> | null = null;

function getDefaultController() {
  if (!defaultController) {
    defaultController = createFacturaController(getComprobanteService());
  }
  return defaultController;
}

export const facturaController = {
  createFactura(req: Request, res: Response, next: NextFunction) {
    return getDefaultController().createFactura(req, res, next);
  }
};
