import test from 'node:test';
import assert from 'node:assert/strict';

test('tiposDocumento has required SRI document types', async () => {
  const { tiposDocumento } = await import('../../dist/catalogs/tiposDocumento.js');

  assert.equal(tiposDocumento['01'].nombre, 'Factura');
  assert.equal(tiposDocumento['04'].nombre, 'Nota de Credito');
  assert.equal(tiposDocumento['07'].nombre, 'Comprobante de Retencion');
});
