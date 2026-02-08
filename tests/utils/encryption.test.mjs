import test from 'node:test';
import assert from 'node:assert/strict';

const GOOD_KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';

test('encrypt/decrypt roundtrip with AES-256-GCM', async () => {
  process.env.ENCRYPTION_KEY = GOOD_KEY;
  const { encrypt, decrypt } = await import('../../dist/utils/encryption.js');

  const input = 'super-secret-password';
  const encrypted = encrypt(input);

  assert.ok(encrypted.encrypted);
  assert.ok(encrypted.iv);
  assert.ok(encrypted.authTag);

  const output = decrypt(encrypted.encrypted, encrypted.iv, encrypted.authTag);
  assert.equal(output, input);
});

test('decrypt fails when authTag is tampered', async () => {
  process.env.ENCRYPTION_KEY = GOOD_KEY;
  const { encrypt, decrypt } = await import('../../dist/utils/encryption.js');

  const encrypted = encrypt('abc123');
  const tamperedTag = encrypted.authTag.slice(0, -2) + 'aa';

  assert.throws(() => decrypt(encrypted.encrypted, encrypted.iv, tamperedTag));
});

test('encrypt throws when ENCRYPTION_KEY has invalid length', async () => {
  process.env.ENCRYPTION_KEY = 'abcd';
  const { encrypt } = await import('../../dist/utils/encryption.js');

  assert.throws(() => encrypt('abc123'), /ENCRYPTION_KEY/);
});
