import * as sriSignerLib from 'ec-sri-invoice-signer';

import { getPrismaClient } from '../../config/prisma.js';
import { decrypt } from '../../utils/encryption.js';

type FirmaRecord = {
  id: string;
  empresaId: string;
  storagePath: string;
  p12PasswordEnc: string;
  p12PasswordIv: string;
  p12PasswordTag: string;
  activa: boolean;
};

type FirmaDeps = {
  db: {
    firmaElectronica: {
      findFirst: (...args: any[]) => Promise<FirmaRecord | null>;
    };
  };
  storage: {
    download: (storagePath: string) => Promise<Buffer>;
  };
  decryptPassword: (encrypted: string, iv: string, authTag: string) => string;
  signers: {
    signInvoiceXml: (xml: string, p12: Buffer, password: string) => Promise<string>;
    signCreditNoteXml: (xml: string, p12: Buffer, password: string) => Promise<string>;
    signWithholdingCertificateXml: (xml: string, p12: Buffer, password: string) => Promise<string>;
  };
  now: () => number;
  cacheTtlMs: number;
};

type SignInput = {
  empresaId: string;
  tipoDocumento: '01' | '04' | '07' | string;
  xml: string;
};

type CacheEntry = {
  cert: Buffer;
  expiresAt: number;
};

function normalizeStoragePath(path: string): string {
  return path.startsWith('firmas/') ? path.slice('firmas/'.length) : path;
}

function resolveSigner(moduleLike: any, fnName: string) {
  return moduleLike?.[fnName] ?? moduleLike?.default?.[fnName];
}

export function createFirmaElectronicaService(customDeps: Partial<FirmaDeps> = {}) {
  const defaultSigners = {
    signInvoiceXml: resolveSigner(sriSignerLib, 'signInvoiceXml'),
    signCreditNoteXml: resolveSigner(sriSignerLib, 'signCreditNoteXml'),
    signWithholdingCertificateXml: resolveSigner(sriSignerLib, 'signWithholdingCertificateXml')
  };

  const deps: FirmaDeps = {
    db: customDeps.db ?? (getPrismaClient() as any),
    storage:
      customDeps.storage ??
      ({
        async download(storagePath: string): Promise<Buffer> {
          const { supabase } = await import('../../config/supabase.js');
          const path = normalizeStoragePath(storagePath);
          const { data, error } = await supabase.storage.from('firmas').download(path);
          if (error || !data) {
            throw new Error(`No se pudo descargar la firma desde storage: ${error?.message ?? 'sin data'}`);
          }
          const bytes = await data.arrayBuffer();
          return Buffer.from(bytes);
        }
      } as FirmaDeps['storage']),
    decryptPassword: customDeps.decryptPassword ?? decrypt,
    now: customDeps.now ?? (() => Date.now()),
    cacheTtlMs: customDeps.cacheTtlMs ?? 5 * 60 * 1000,
    signers: {
      ...defaultSigners,
      ...(customDeps.signers ?? {})
    }
  };

  const cache = new Map<string, CacheEntry>();

  async function loadCertificate(firma: FirmaRecord): Promise<Buffer> {
    const cached = cache.get(firma.id);
    const now = deps.now();

    if (cached && cached.expiresAt > now) {
      return cached.cert;
    }

    const cert = await deps.storage.download(firma.storagePath);
    cache.set(firma.id, { cert, expiresAt: now + deps.cacheTtlMs });
    return cert;
  }

  async function signXmlForEmpresa(input: SignInput): Promise<string> {
    const firma = await deps.db.firmaElectronica.findFirst({
      where: {
        empresaId: input.empresaId,
        activa: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!firma) {
      throw new Error('La empresa no tiene firma electronica activa');
    }

    const cert = await loadCertificate(firma);
    const password = deps.decryptPassword(firma.p12PasswordEnc, firma.p12PasswordIv, firma.p12PasswordTag);

    if (input.tipoDocumento === '01') {
      return deps.signers.signInvoiceXml(input.xml, cert, password);
    }
    if (input.tipoDocumento === '04') {
      return deps.signers.signCreditNoteXml(input.xml, cert, password);
    }
    if (input.tipoDocumento === '07') {
      return deps.signers.signWithholdingCertificateXml(input.xml, cert, password);
    }

    throw new Error(`Tipo de documento no soportado para firma: ${input.tipoDocumento}`);
  }

  return {
    signXmlForEmpresa
  };
}

let defaultService: ReturnType<typeof createFirmaElectronicaService> | null = null;

export function getFirmaElectronicaService() {
  if (!defaultService) {
    defaultService = createFirmaElectronicaService();
  }
  return defaultService;
}
