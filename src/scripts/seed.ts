import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

import { getPrismaClient } from '../config/prisma.js';
import { encrypt } from '../utils/encryption.js';
import { generateApiKey } from '../utils/apiKey.js';

type SeedEnv = {
  SEED_RUC?: string;
  SEED_RAZON_SOCIAL?: string;
  SEED_DIRECCION_MATRIZ?: string;
  SEED_DIRECCION_ESTABLECIMIENTO?: string;
  SEED_P12_PATH?: string;
  SEED_P12_PASSWORD?: string;
  SEED_API_KEY_NAME?: string;
};

type SeedDeps = {
  env: SeedEnv;
  readFile: (path: string) => Promise<Buffer>;
  db: {
    empresa: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string; ruc: string }>;
    };
    firmaElectronica: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    };
    apiKey: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    };
  };
  uploadFirma: (path: string, content: Buffer) => Promise<void>;
  encryptPassword: (plain: string) => { encrypted: string; iv: string; authTag: string };
  generateApiKey: () => string;
  parseCertificate: (p12Buffer: Buffer, password: string) => Promise<{ titular?: string | null; rucTitular?: string | null }>;
  generateId: () => string;
  log: (line: string) => void;
};

function required(name: keyof SeedEnv, env: SeedEnv): string {
  const value = env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Variable requerida: ${name}`);
  }
  return String(value).trim();
}

async function defaultUploadFirma(path: string, content: Buffer): Promise<void> {
  const { supabase } = await import('../config/supabase.js');
  const normalized = path.startsWith('firmas/') ? path.slice('firmas/'.length) : path;
  const { error } = await supabase.storage.from('firmas').upload(normalized, content, {
    upsert: true,
    contentType: 'application/x-pkcs12'
  });
  if (error) {
    throw new Error(`No se pudo subir firma seed: ${error.message}`);
  }
}

async function defaultParseCertificate(p12Buffer: Buffer, password: string) {
  if (!Buffer.isBuffer(p12Buffer) || p12Buffer.length === 0) {
    throw new Error('Archivo .p12 invalido');
  }
  if (!password || !password.trim()) {
    throw new Error('Contrasena .p12 requerida');
  }
  return { titular: null, rucTitular: null };
}

export function createSeedRunner(customDeps: Partial<SeedDeps> = {}) {
  const deps: SeedDeps = {
    env: customDeps.env ?? (process.env as SeedEnv),
    readFile: customDeps.readFile ?? (async (path) => readFile(path)),
    db: customDeps.db ?? (getPrismaClient() as any),
    uploadFirma: customDeps.uploadFirma ?? defaultUploadFirma,
    encryptPassword: customDeps.encryptPassword ?? encrypt,
    generateApiKey: customDeps.generateApiKey ?? generateApiKey,
    parseCertificate: customDeps.parseCertificate ?? defaultParseCertificate,
    generateId: customDeps.generateId ?? (() => randomUUID()),
    log: customDeps.log ?? ((line) => console.log(line))
  };

  return async function runSeed() {
    const ruc = required('SEED_RUC', deps.env);
    const razonSocial = required('SEED_RAZON_SOCIAL', deps.env);
    const direccionMatriz = required('SEED_DIRECCION_MATRIZ', deps.env);
    const direccionEstablecimiento = required('SEED_DIRECCION_ESTABLECIMIENTO', deps.env);
    const p12Path = required('SEED_P12_PATH', deps.env);
    const p12Password = required('SEED_P12_PASSWORD', deps.env);
    const apiKeyName = deps.env.SEED_API_KEY_NAME?.trim() || 'Seed API Key';

    const p12Buffer = await deps.readFile(p12Path);
    const certInfo = await deps.parseCertificate(p12Buffer, p12Password);
    if (certInfo.rucTitular && certInfo.rucTitular !== ruc) {
      throw new Error('RUC del certificado no coincide con SEED_RUC');
    }

    const empresa = await deps.db.empresa.create({
      data: {
        ruc,
        razonSocial,
        direccionMatriz,
        direccionEstablecimiento,
        codEstablecimiento: '001',
        ptoEmision: '001',
        ambiente: '1',
        tipoEmision: '1',
        activa: true
      }
    });

    const firmaId = deps.generateId();
    const storagePath = `firmas/${empresa.id}/${firmaId}.p12`;
    await deps.uploadFirma(storagePath, p12Buffer);

    const enc = deps.encryptPassword(p12Password);
    await deps.db.firmaElectronica.create({
      data: {
        id: firmaId,
        empresaId: empresa.id,
        storagePath,
        p12PasswordEnc: enc.encrypted,
        p12PasswordIv: enc.iv,
        p12PasswordTag: enc.authTag,
        titular: certInfo.titular ?? null,
        rucTitular: certInfo.rucTitular ?? null,
        activa: true
      }
    });

    const apiKey = deps.generateApiKey();
    await deps.db.apiKey.create({
      data: {
        empresaId: empresa.id,
        key: apiKey,
        nombre: apiKeyName,
        permisos: ['factura', 'notaCredito', 'retencion', 'consulta'],
        activa: true
      }
    });

    const output = { empresaId: empresa.id, apiKey, ruc: empresa.ruc };
    deps.log(JSON.stringify(output));
    return output;
  };
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const runSeed = createSeedRunner();
  runSeed().catch((error) => {
    console.error('Seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
