import test from 'node:test';
import assert from 'node:assert/strict';

test('firma and tenant config routes are mounted in source index routes', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../../src/routes/index.ts', import.meta.url), 'utf8');

  assert.match(source, /\/firma-electronica/);
  assert.match(source, /\/firma-electronica\/estado/);
  assert.match(source, /\/firma-electronica\/historial/);
  assert.match(source, /\/configuracion\/empresa/);
});
