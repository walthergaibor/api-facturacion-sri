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

test('notaCreditoController rejects when empresaId is missing', async () => {
  const { createNotaCreditoController } = await import('../../dist/controllers/notaCreditoController.js');

  const controller = createNotaCreditoController({
    emitirNotaCredito: async () => ({})
  });

  const req = { body: {} };
  const res = makeRes();

  await controller.createNotaCredito(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.success, false);
});
