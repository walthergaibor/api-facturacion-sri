import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('prisma client setup supports postgres adapter for Prisma 7 client engine', async () => {
  const source = await fs.readFile(new URL('../../src/config/prisma.ts', import.meta.url), 'utf8');

  assert.match(source, /@prisma\/adapter-pg/);
  assert.match(source, /adapter/);
  assert.match(source, /pooler\.supabase\.com/);
  assert.match(source, /searchParams\.delete\('sslmode'\)/);
  assert.match(source, /rejectUnauthorized:\s*false/);
});
