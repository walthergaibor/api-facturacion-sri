import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs/promises';

test('prisma client generator is configured for binary engine in server deploys', async () => {
  const schema = await fs.readFile(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8');

  assert.match(schema, /generator\s+client\s*\{[\s\S]*engineType\s*=\s*"binary"/m);
});
