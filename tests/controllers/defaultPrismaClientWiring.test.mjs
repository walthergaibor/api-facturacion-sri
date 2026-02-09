import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs/promises';

test('controllers use getPrismaClient() for default wiring', async () => {
  const empresaSource = await fs.readFile(new URL('../../src/controllers/empresaController.ts', import.meta.url), 'utf8');
  const apiKeySource = await fs.readFile(new URL('../../src/controllers/apiKeyController.ts', import.meta.url), 'utf8');
  const secuencialSource = await fs.readFile(new URL('../../src/utils/secuencial.ts', import.meta.url), 'utf8');

  assert.match(empresaSource, /getPrismaClient\(\)/);
  assert.match(apiKeySource, /getPrismaClient\(\)/);
  assert.match(secuencialSource, /getPrismaClient\(\)/);
});
