import type { NextFunction, Request, Response } from 'express';

import { getPrismaClient } from '../config/prisma.js';

type ApiKeyLookupResult = {
  id: string;
  empresaId: string;
  permisos?: string[];
};

type PrismaLike = {
  apiKey: {
    findFirst: (...args: any[]) => Promise<any>;
    update?: (...args: any[]) => Promise<any>;
  };
};

function getApiKeyFromHeaders(req: Request): string | undefined {
  const direct = typeof req.header === 'function' ? req.header('x-api-key') : undefined;
  const fallback = req.headers['x-api-key'];
  const raw = direct ?? fallback;

  if (Array.isArray(raw)) {
    return raw[0]?.trim();
  }

  return typeof raw === 'string' ? raw.trim() : undefined;
}

function unauthorized(res: Response, message: string): Response {
  return res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message
    }
  });
}

function forbidden(res: Response, message: string): Response {
  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message
    }
  });
}

function resolveRequiredPermission(req: Request): string | null {
  const route = req.path ?? '';
  if (route.startsWith('/api/v1/facturas')) return 'factura';
  if (route.startsWith('/api/v1/notas-credito')) return 'notaCredito';
  if (route.startsWith('/api/v1/retenciones')) return 'retencion';
  if (route.startsWith('/api/v1/comprobantes')) return 'consulta';
  return null;
}

export function createApiKeyAuth(db: PrismaLike, masterApiKey = process.env.MASTER_API_KEY ?? '') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apiKey = getApiKeyFromHeaders(req);

      if (!apiKey) {
        unauthorized(res, 'Missing X-API-Key header');
        return;
      }

      if (masterApiKey && apiKey === masterApiKey) {
        req.isAdmin = true;
        next();
        return;
      }

      const keyRecord = (await db.apiKey.findFirst({
        where: {
          key: apiKey,
          activa: true,
          empresa: { activa: true }
        },
        select: {
          id: true,
          empresaId: true,
          permisos: true
        }
      })) as ApiKeyLookupResult | null;

      if (!keyRecord) {
        unauthorized(res, 'Invalid API key');
        return;
      }

      const requiredPermission = resolveRequiredPermission(req);
      const grantedPermissions = keyRecord.permisos ?? [];
      if (requiredPermission && !grantedPermissions.includes(requiredPermission)) {
        forbidden(res, 'API key does not have permission for this endpoint');
        return;
      }

      if (typeof db.apiKey.update === 'function') {
        await db.apiKey.update({
          where: { id: keyRecord.id },
          data: { ultimoUso: new Date() }
        });
      }

      req.isAdmin = false;
      req.apiKeyId = keyRecord.id;
      req.empresaId = keyRecord.empresaId;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const middleware = createApiKeyAuth(getPrismaClient());
  return middleware(req, res, next);
}
