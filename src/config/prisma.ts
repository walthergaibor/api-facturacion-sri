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

      // pg v8 trata sslmode=require como verify-full, lo que rechaza certificados
      // de proveedores cloud (Supabase, Neon, etc.) cuya CA no está en la cadena
      // de confianza de Node.js. Inyectamos uselibpqcompat=true para que pg use
      // la semántica estándar de libpq donde require = TLS sin verificar CA.
      // Además configuramos ssl.rejectUnauthorized=false como respaldo.
      let connString = process.env.DATABASE_URL;
      const ssl =
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : undefined;

      if (ssl && !connString.includes('uselibpqcompat')) {
        const separator = connString.includes('?') ? '&' : '?';
        connString = `${connString}${separator}uselibpqcompat=true`;
      }

      // #region agent log
      const dbHost = connString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
      console.log(`[DEBUG-PRISMA] NODE_ENV=${process.env.NODE_ENV}, ssl=${JSON.stringify(ssl)}, connString=${dbHost}`);
      // #endregion

      const adapter = new PrismaPg({
        connectionString: connString,
        ssl,
      });
      // #region agent log
      console.log('[DEBUG-PRISMA] PrismaPg adapter created successfully with ssl and uselibpqcompat');
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
