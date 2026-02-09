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
      let connString = process.env.DATABASE_URL;
      let ssl: { rejectUnauthorized: boolean } | undefined;

      // Supabase pooler on some hosts can fail strict CA validation with Node pg.
      // Apply normalization independent of NODE_ENV to avoid env misconfiguration
      // in PaaS dashboards.
      if (connString.includes('pooler.supabase.com')) {
        ssl = { rejectUnauthorized: false };
        const url = new URL(connString);
        url.searchParams.delete('sslmode');
        url.searchParams.delete('uselibpqcompat');
        connString = url.toString();
      }

      const adapter = new PrismaPg({ connectionString: connString, ssl });
      return new PrismaClient({ adapter, log });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
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
