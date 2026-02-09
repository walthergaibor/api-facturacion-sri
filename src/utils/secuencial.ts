import { getPrismaClient } from '../config/prisma.js';

type SecuencialInput = {
  empresaId: string;
  tipoDocumento: string;
  codEstablecimiento: string;
  ptoEmision: string;
};

type PrismaLike = {
  secuencial: {
    upsert: (...args: any[]) => Promise<{ secuenciaActual: number }>;
  };
};

export function createSecuencialService(db: PrismaLike) {
  return {
    async getNextSecuencial(input: SecuencialInput): Promise<string> {
      const record = await db.secuencial.upsert({
        where: {
          empresaId_tipoDocumento_codEstablecimiento_ptoEmision: {
            empresaId: input.empresaId,
            tipoDocumento: input.tipoDocumento,
            codEstablecimiento: input.codEstablecimiento,
            ptoEmision: input.ptoEmision
          }
        },
        create: {
          empresaId: input.empresaId,
          tipoDocumento: input.tipoDocumento,
          codEstablecimiento: input.codEstablecimiento,
          ptoEmision: input.ptoEmision,
          secuenciaActual: 1
        },
        update: {
          secuenciaActual: { increment: 1 }
        },
        select: {
          secuenciaActual: true
        }
      });

      return String(record.secuenciaActual).padStart(9, '0');
    }
  };
}

function getDefaultService() {
  return createSecuencialService(getPrismaClient() as unknown as PrismaLike);
}

export const secuencialService = {
  getNextSecuencial: (input: SecuencialInput) => getDefaultService().getNextSecuencial(input)
};
