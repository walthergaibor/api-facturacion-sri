import test from 'node:test';
import assert from 'node:assert/strict';

test('comprobante routes are mounted in source index routes', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../../src/routes/index.ts', import.meta.url), 'utf8');

  assert.match(source, /\/facturas/);
  assert.match(source, /\/notas-credito/);
  assert.match(source, /\/retenciones/);
  assert.match(source, /\/comprobantes/);
  assert.match(source, /\/comprobantes\/:claveAcceso\/ride/);
  assert.match(source, /\/comprobantes\/:claveAcceso\/email/);
});
