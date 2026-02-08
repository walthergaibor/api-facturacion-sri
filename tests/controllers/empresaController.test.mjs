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

test('createEmpresa creates company and initial API key', async () => {
  const { createEmpresaController } = await import('../../dist/controllers/empresaController.js');

  const db = {
    empresa: {
      create: async ({ data }) => ({ id: 'empresa-1', ...data })
    },
    apiKey: {
      create: async ({ data }) => ({ id: 'key-1', ...data })
    }
  };

  const req = {
    body: {
      ruc: '0999999999001',
      razonSocial: 'Empresa Demo',
      direccionMatriz: 'Quito',
      direccionEstablecimiento: 'Quito'
    }
  };
  const res = makeRes();

  await createEmpresaController(db).createEmpresa(req, res, () => {});

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.empresaId, 'empresa-1');
  assert.equal(typeof res.payload.data.apiKey, 'string');
  assert.ok(res.payload.data.apiKey.length >= 32);
});

test('empresaController returns own config by req.empresaId', async () => {
  const { createEmpresaController } = await import('../../dist/controllers/empresaController.js');

  const controller = createEmpresaController({
    empresa: {
      create: async () => ({}),
      findMany: async () => [],
      findUnique: async ({ where }) => ({ id: where.id, razonSocial: 'Empresa Tenant' }),
      update: async () => ({})
    },
    apiKey: { create: async () => ({}) }
  });

  const req = { empresaId: 'empresa-1' };
  const res = makeRes();

  await controller.getOwnEmpresa(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.id, 'empresa-1');
});

test('empresaController updates own config by req.empresaId', async () => {
  const { createEmpresaController } = await import('../../dist/controllers/empresaController.js');

  let updatedId = null;
  const controller = createEmpresaController({
    empresa: {
      create: async () => ({}),
      findMany: async () => [],
      findUnique: async ({ where }) => ({ id: where.id, razonSocial: 'Empresa Tenant' }),
      update: async ({ where, data }) => {
        updatedId = where.id;
        return { id: where.id, ...data };
      }
    },
    apiKey: { create: async () => ({}) }
  });

  const req = { empresaId: 'empresa-1', body: { razonSocial: 'Nueva Razon' } };
  const res = makeRes();

  await controller.updateOwnEmpresa(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(updatedId, 'empresa-1');
  assert.equal(res.payload.data.razonSocial, 'Nueva Razon');
});
