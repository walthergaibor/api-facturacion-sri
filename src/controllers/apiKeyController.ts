import type { NextFunction, Request, Response } from 'express';

import { prisma } from '../config/prisma.js';
import { generateApiKey } from '../utils/apiKey.js';

type PrismaLike = {
  apiKey: {
    create: (...args: any[]) => Promise<any>;
    findMany: (...args: any[]) => Promise<any[]>;
    findUnique: (...args: any[]) => Promise<any | null>;
    update: (...args: any[]) => Promise<any>;
  };
};

export function createApiKeyController(db: PrismaLike) {
  return {
    createApiKey: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const empresaId = req.isAdmin ? req.body?.empresaId : req.empresaId;
        if (!empresaId) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'empresaId es requerido' }
          });
          return;
        }

        const key = generateApiKey();
        const created = await db.apiKey.create({
          data: {
            empresaId,
            key,
            nombre: req.body?.nombre ?? 'Nueva clave',
            permisos: req.body?.permisos ?? ['factura', 'notaCredito', 'retencion', 'consulta'],
            activa: true
          }
        });

        res.status(201).json({
          success: true,
          data: {
            id: created.id,
            empresaId,
            key
          }
        });
      } catch (error) {
        next(error);
      }
    },

    listApiKeys: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const empresaId = req.isAdmin ? (req.query.empresaId as string | undefined) : req.empresaId;
        const where = empresaId ? { empresaId } : {};
        const keys = await db.apiKey.findMany({ where, orderBy: { createdAt: 'desc' } });
        res.status(200).json({ success: true, data: keys });
      } catch (error) {
        next(error);
      }
    },

    revokeApiKey: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const id = req.params.id;
        const current = await db.apiKey.findUnique({ where: { id } });

        if (!current) {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'API Key no encontrada' }
          });
          return;
        }

        if (!req.isAdmin && current.empresaId !== req.empresaId) {
          res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'No puede revocar API Keys de otra empresa' }
          });
          return;
        }

        const revoked = await db.apiKey.update({
          where: { id },
          data: { activa: false }
        });

        res.status(200).json({ success: true, data: revoked });
      } catch (error) {
        next(error);
      }
    }
  };
}

export const apiKeyController = createApiKeyController(prisma as unknown as PrismaLike);
