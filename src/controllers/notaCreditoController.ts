import type { NextFunction, Request, Response } from 'express';

import { getComprobanteService } from '../services/sri/comprobanteService.js';

type NotaCreditoService = {
  emitirNotaCredito: (input: { empresaId: string; data: Record<string, unknown> }) => Promise<unknown>;
};

export function createNotaCreditoController(service: NotaCreditoService) {
  return {
    createNotaCredito: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

        const result = await service.emitirNotaCredito({
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

let defaultController: ReturnType<typeof createNotaCreditoController> | null = null;

function getDefaultController() {
  if (!defaultController) {
    defaultController = createNotaCreditoController(getComprobanteService());
  }
  return defaultController;
}

export const notaCreditoController = {
  createNotaCredito(req: Request, res: Response, next: NextFunction) {
    return getDefaultController().createNotaCredito(req, res, next);
  }
};
