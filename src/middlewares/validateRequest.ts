import type { NextFunction, Request, Response } from 'express';

type SafeParseSuccess<T> = {
  success: true;
  data: T;
};

type SafeParseFailure = {
  success: false;
  error: {
    flatten?: () => unknown;
  };
};

type ParseSchema<T> = {
  safeParse: (input: unknown) => SafeParseSuccess<T> | SafeParseFailure;
};

type ValidationSchemas = {
  body?: ParseSchema<unknown>;
  params?: ParseSchema<unknown>;
  query?: ParseSchema<unknown>;
};

function getValidationDetails(error: SafeParseFailure['error']): unknown {
  if (typeof error.flatten === 'function') {
    return error.flatten();
  }

  return error;
}

export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const entries: Array<['body' | 'params' | 'query', ParseSchema<unknown> | undefined]> = [
      ['body', schemas.body],
      ['params', schemas.params],
      ['query', schemas.query]
    ];

    for (const [target, schema] of entries) {
      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[target]);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: getValidationDetails(result.error)
          }
        });
        return;
      }

      req[target] = result.data as never;
    }

    next();
  };
}
