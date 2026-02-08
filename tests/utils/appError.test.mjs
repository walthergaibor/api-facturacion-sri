import test from 'node:test';
import assert from 'node:assert/strict';

test('AppError stores statusCode, code and details', async () => {
  const { AppError } = await import('../../dist/utils/AppError.js');

  const err = new AppError(422, 'VALIDATION_ERROR', 'Invalid payload', { field: 'ruc' });

  assert.equal(err.statusCode, 422);
  assert.equal(err.code, 'VALIDATION_ERROR');
  assert.equal(err.message, 'Invalid payload');
  assert.deepEqual(err.details, { field: 'ruc' });
});
