import test from 'node:test';
import assert from 'node:assert/strict';

test('catalog routes are mounted in source index routes', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../../src/routes/index.ts', import.meta.url), 'utf8');

  assert.match(source, /\/catalogos\/tipos-identificacion/);
  assert.match(source, /\/catalogos\/tipos-impuesto/);
  assert.match(source, /\/catalogos\/formas-pago/);
  assert.match(source, /\/catalogos\/tipos-documento/);
});
