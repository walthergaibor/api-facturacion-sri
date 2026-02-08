declare global {
  namespace Express {
    interface Request {
      empresaId?: string;
      isAdmin?: boolean;
      apiKeyId?: string;
      file?: {
        buffer: Buffer;
        originalname?: string;
      };
    }
  }
}

export {};
