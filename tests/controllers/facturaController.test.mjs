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

test('facturaController uses req.empresaId and returns emission result', async () => {
  const { createFacturaController } = await import('../../dist/controllers/facturaController.js');

  let seenEmpresaId = null;
  const controller = createFacturaController({
    emitirFactura: async ({ empresaId }) => {
      seenEmpresaId = empresaId;
      return { claveAcceso: '123', estado: 'AUTORIZADO', autorizacion: { numero: '1' } };
    }
  });

  const req = { empresaId: 'empresa-1', body: { any: 'payload' } };
  const res = makeRes();

  await controller.createFactura(req, res, () => {});

  assert.equal(seenEmpresaId, 'empresa-1');
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.data.estado, 'AUTORIZADO');
});
