import type { NextFunction, Request, Response } from 'express';

type ErrorLike = {
  statusCode?: number;
  code?: string;
  message?: string;
  details?: unknown;
};

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const knownError = err as ErrorLike;
  console.error('[errorHandler]', err);
  const statusCode = typeof knownError?.statusCode === 'number' ? knownError.statusCode : 500;
  const code = typeof knownError?.code === 'string' ? knownError.code : 'INTERNAL_ERROR';
  const message =
    typeof knownError?.message === 'string' && knownError.message.trim().length > 0
      ? knownError.message
      : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: knownError?.details
    }
  });
}
