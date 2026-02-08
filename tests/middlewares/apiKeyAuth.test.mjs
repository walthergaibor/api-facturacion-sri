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

test('apiKeyAuth returns 401 when x-api-key header is missing', async () => {
  const { createApiKeyAuth } = await import('../../dist/middlewares/apiKeyAuth.js');
  const middleware = createApiKeyAuth({ apiKey: { findFirst: async () => null } }, 'master-key');

  const req = { headers: {} };
  const res = makeRes();
  let nextCalled = false;

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.success, false);
});

test('apiKeyAuth marks request as admin when MASTER_API_KEY is used', async () => {
  const { createApiKeyAuth } = await import('../../dist/middlewares/apiKeyAuth.js');
  const middleware = createApiKeyAuth({ apiKey: { findFirst: async () => null } }, 'master-key');

  const req = { headers: { 'x-api-key': 'master-key' } };
  const res = makeRes();
  let nextCalled = false;

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.isAdmin, true);
  assert.equal(req.empresaId, undefined);
});

test('apiKeyAuth resolves tenant and attaches empresaId for a valid API key', async () => {
  const { createApiKeyAuth } = await import('../../dist/middlewares/apiKeyAuth.js');
  let updatedId = null;
  const middleware = createApiKeyAuth(
    {
      apiKey: {
        findFirst: async () => ({
          id: 'key-1',
          empresaId: 'empresa-1',
          permisos: ['consulta'],
          activa: true,
          empresa: { id: 'empresa-1', activa: true }
        }),
        update: async ({ where }) => {
          updatedId = where.id;
          return {};
        }
      }
    },
    'master-key'
  );

  const req = { headers: { 'x-api-key': 'client-key' }, path: '/api/v1/comprobantes' };
  const res = makeRes();
  let nextCalled = false;

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.isAdmin, false);
  assert.equal(req.empresaId, 'empresa-1');
  assert.equal(req.apiKeyId, 'key-1');
  assert.equal(updatedId, 'key-1');
});

test('apiKeyAuth returns 403 when api key has no permission for endpoint', async () => {
  const { createApiKeyAuth } = await import('../../dist/middlewares/apiKeyAuth.js');
  const middleware = createApiKeyAuth(
    {
      apiKey: {
        findFirst: async () => ({ id: 'key-1', empresaId: 'empresa-1', permisos: ['consulta'] })
      }
    },
    'master-key'
  );

  const req = { headers: { 'x-api-key': 'client-key' }, path: '/api/v1/facturas' };
  const res = makeRes();
  let nextCalled = false;

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.error.code, 'FORBIDDEN');
});
