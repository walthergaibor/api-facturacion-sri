import test from 'node:test';
import assert from 'node:assert/strict';

function makeRes() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };
}

test('firmaController uploads new signature and deactivates previous one', async () => {
  const { createFirmaController } = await import('../../dist/controllers/firmaController.js');

  let deactivated = false;
  const controller = createFirmaController({
    db: {
      empresa: {
        findUnique: async () => ({ id: 'empresa-1', ruc: '1710034065001' })
      },
      firmaElectronica: {
        findFirst: async () => ({ id: 'old-firma', activa: true }),
        updateMany: async () => {
          deactivated = true;
          return { count: 1 };
        },
        create: async ({ data }) => ({ id: 'new-firma', ...data }),
        findMany: async () => []
      }
    },
    storage: {
      upload: async () => {}
    },
    parseCertificate: async () => ({ titular: 'Titular', rucTitular: '1710034065001' }),
    crypto: {
      encrypt: () => ({ encrypted: 'enc', iv: 'iv', authTag: 'tag' })
    },
    generateId: () => 'new-firma'
  });

  const req = {
    empresaId: 'empresa-1',
    body: { p12Password: 'secret' },
    file: { buffer: Buffer.from('p12'), originalname: 'cert.p12' }
  };
  const res = makeRes();

  await controller.uploadFirma(req, res, () => {});

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(deactivated, true);
  assert.equal(res.payload.data.id, 'new-firma');
});

test('firmaController returns active signature status for authenticated tenant', async () => {
  const { createFirmaController } = await import('../../dist/controllers/firmaController.js');

  const controller = createFirmaController({
    db: {
      empresa: { findUnique: async () => ({ id: 'empresa-1', ruc: '1710034065001' }) },
      firmaElectronica: {
        findFirst: async () => ({ id: 'firma-1', titular: 'Titular', vigenciaHasta: new Date('2026-12-31') }),
        findMany: async () => []
      }
    },
    storage: { upload: async () => {} },
    parseCertificate: async () => ({}),
    crypto: { encrypt: () => ({ encrypted: '', iv: '', authTag: '' }) },
    generateId: () => 'id'
  });

  const req = { empresaId: 'empresa-1' };
  const res = makeRes();

  await controller.getFirmaEstado(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.id, 'firma-1');
});
