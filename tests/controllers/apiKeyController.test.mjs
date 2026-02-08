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

test('listApiKeys for non-admin only returns own company keys', async () => {
  const { createApiKeyController } = await import('../../dist/controllers/apiKeyController.js');

  const seen = { where: null };
  const db = {
    apiKey: {
      findMany: async ({ where }) => {
        seen.where = where;
        return [];
      }
    }
  };

  const req = { isAdmin: false, empresaId: 'empresa-a', query: {} };
  const res = makeRes();

  await createApiKeyController(db).listApiKeys(req, res, () => {});

  assert.deepEqual(seen.where, { empresaId: 'empresa-a' });
  assert.equal(res.statusCode, 200);
});

test('revokeApiKey rejects non-admin deleting key from another company', async () => {
  const { createApiKeyController } = await import('../../dist/controllers/apiKeyController.js');

  const db = {
    apiKey: {
      findUnique: async () => ({ id: 'key-2', empresaId: 'empresa-b', activa: true }),
      update: async () => ({ id: 'key-2', activa: false })
    }
  };

  const req = { isAdmin: false, empresaId: 'empresa-a', params: { id: 'key-2' } };
  const res = makeRes();

  await createApiKeyController(db).revokeApiKey(req, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.error.code, 'FORBIDDEN');
});
