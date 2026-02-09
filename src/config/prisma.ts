import { createRequire } from 'node:module';

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const require = createRequire(import.meta.url);

function createPrismaClient(): PrismaClient {
  const log: Array<'query' | 'error' | 'warn'> =
    process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'];

  // Prisma 7 can run with JS engine (client) and requires adapter/accelerate.
  // In server deploys with PostgreSQL, use adapter-pg when available.
  if (process.env.DATABASE_URL) {
    try {
      const { PrismaPg } = require('@prisma/adapter-pg');

      // Supabase (y otros proveedores cloud) usan certificados que pueden no estar
      // en la cadena de confianza de Node.js. En producción, aceptamos el certificado
      // del servidor ya que la conexión sigue siendo encriptada con TLS.
      const ssl =
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : undefined;

      // #region agent log
      const dbHost = process.env.DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
      console.log(`[DEBUG-PRISMA] NODE_ENV=${process.env.NODE_ENV}, ssl=${JSON.stringify(ssl)}, dbHost=${dbHost}`);
      // #endregion

      const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        ssl,
      });
      // #region agent log
      console.log('[DEBUG-PRISMA] PrismaPg adapter created successfully');
      // #endregion
      return new PrismaClient({ adapter, log });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // #region agent log
      console.error(`[DEBUG-PRISMA] Error creating adapter: ${message}`);
      // #endregion
      throw new Error(
        `No se pudo inicializar Prisma con @prisma/adapter-pg. ` +
          `Instale la dependencia y redeploye. Causa: ${message}`
      );
    }
  }

  return new PrismaClient({ log });
}

export function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = globalForPrisma.prisma;
