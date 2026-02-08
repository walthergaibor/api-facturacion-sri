import test from 'node:test';
import assert from 'node:assert/strict';

test('seed script creates empresa, firma and api key then prints credentials', async () => {
  const { createSeedRunner } = await import('../../dist/scripts/seed.js');

  const calls = { empresa: 0, firma: 0, apiKey: 0, uploadPath: null, output: null };

  const runSeed = createSeedRunner({
    env: {
      SEED_RUC: '1710034065001',
      SEED_RAZON_SOCIAL: 'Empresa Seed',
      SEED_DIRECCION_MATRIZ: 'Quito',
      SEED_DIRECCION_ESTABLECIMIENTO: 'Quito',
      SEED_P12_PATH: '/tmp/cert.p12',
      SEED_P12_PASSWORD: 'secret',
      SEED_API_KEY_NAME: 'Seed Key'
    },
    readFile: async () => Buffer.from('p12-binary'),
    db: {
      empresa: {
        create: async ({ data }) => {
          calls.empresa += 1;
          return { id: 'empresa-1', ...data };
        }
      },
      firmaElectronica: {
        create: async ({ data }) => {
          calls.firma += 1;
          return { id: 'firma-1', ...data };
        }
      },
      apiKey: {
        create: async ({ data }) => {
          calls.apiKey += 1;
          return { id: 'key-1', ...data };
        }
      }
    },
    uploadFirma: async (path) => {
      calls.uploadPath = path;
    },
    encryptPassword: () => ({ encrypted: 'enc', iv: 'iv', authTag: 'tag' }),
    generateApiKey: () => 'api_key_seed',
    parseCertificate: async () => ({ titular: 'Titular', rucTitular: '1710034065001' }),
    generateId: () => 'firma-1',
    log: (line) => {
      calls.output = line;
    }
  });

  const result = await runSeed();

  assert.equal(calls.empresa, 1);
  assert.equal(calls.firma, 1);
  assert.equal(calls.apiKey, 1);
  assert.match(calls.uploadPath, /firmas\/empresa-1\/firma-1\.p12/);
  assert.equal(result.empresaId, 'empresa-1');
  assert.equal(result.apiKey, 'api_key_seed');
  assert.match(String(calls.output), /empresa-1/);
});
