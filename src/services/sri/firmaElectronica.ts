import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

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
  normalizeLegacyPkcs12: (p12: Buffer, password: string) => Promise<Buffer>;
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

const execFileAsync = promisify(execFile);

async function normalizeLegacyPkcs12WithOpenSsl(p12: Buffer, password: string): Promise<Buffer> {
  const tempBase = await mkdtemp(join(tmpdir(), 'neo-p12-'));
  const inputPath = join(tempBase, `${randomUUID()}.p12`);
  const pemPath = join(tempBase, `${randomUUID()}.pem`);
  const outputPath = join(tempBase, `${randomUUID()}.p12`);

  try {
    await writeFile(inputPath, p12);
    await execFileAsync('openssl', [
      'pkcs12',
      '-legacy',
      '-in',
      inputPath,
      '-out',
      pemPath,
      '-nodes',
      '-passin',
      `pass:${password}`
    ]);

    await execFileAsync('openssl', [
      'pkcs12',
      '-export',
      '-in',
      pemPath,
      '-out',
      outputPath,
      '-passout',
      `pass:${password}`,
      '-keypbe',
      'AES-256-CBC',
      '-certpbe',
      'AES-256-CBC',
      '-macalg',
      'sha256'
    ]);

    return await readFile(outputPath);
  } finally {
    await rm(tempBase, { recursive: true, force: true });
  }
}

export function createFirmaElectronicaService(customDeps: Partial<FirmaDeps> = {}) {
  const signInvoiceXml = resolveSigner(sriSignerLib, 'signInvoiceXml');
  const signCreditNoteXml = resolveSigner(sriSignerLib, 'signCreditNoteXml');
  const signWithholdingCertificateXml = resolveSigner(sriSignerLib, 'signWithholdingCertificateXml');

  const defaultSigners = {
    signInvoiceXml: async (xml: string, p12: Buffer, password: string) =>
      signInvoiceXml(xml, p12, { pkcs12Password: password }),
    signCreditNoteXml: async (xml: string, p12: Buffer, password: string) =>
      signCreditNoteXml(xml, p12, { pkcs12Password: password }),
    signWithholdingCertificateXml: async (xml: string, p12: Buffer, password: string) =>
      signWithholdingCertificateXml(xml, p12, { pkcs12Password: password })
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
    },
    normalizeLegacyPkcs12: customDeps.normalizeLegacyPkcs12 ?? normalizeLegacyPkcs12WithOpenSsl
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
    const password = deps
      .decryptPassword(firma.p12PasswordEnc, firma.p12PasswordIv, firma.p12PasswordTag)
      .trim();

    if (!password) {
      throw new Error('La clave de firma electronica almacenada es invalida');
    }

    const signWithCertificate = async (certBuffer: Buffer) => {
      if (input.tipoDocumento === '01') {
        return deps.signers.signInvoiceXml(input.xml, certBuffer, password);
      }
      if (input.tipoDocumento === '04') {
        return deps.signers.signCreditNoteXml(input.xml, certBuffer, password);
      }
      if (input.tipoDocumento === '07') {
        return deps.signers.signWithholdingCertificateXml(input.xml, certBuffer, password);
      }
      throw new Error(`Tipo de documento no soportado para firma: ${input.tipoDocumento}`);
    };

    try {
      return await signWithCertificate(cert);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const looksLikeLegacyPkcs12Error =
        message.includes('PKCS#12 MAC could not be verified') ||
        message.includes('Invalid password?');

      if (!looksLikeLegacyPkcs12Error) {
        throw error;
      }

      const normalizedP12 = await deps.normalizeLegacyPkcs12(cert, password);
      return signWithCertificate(normalizedP12);
    }
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
