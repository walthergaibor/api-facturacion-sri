import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('start script regenerates prisma client before booting app', async () => {
  const pkgRaw = await fs.readFile(new URL('../../package.json', import.meta.url), 'utf8');
  const pkg = JSON.parse(pkgRaw);

  assert.match(String(pkg.scripts?.start ?? ''), /prisma generate/);
});
