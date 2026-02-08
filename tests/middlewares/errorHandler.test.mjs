import test from 'node:test';
import assert from 'node:assert/strict';

test('errorHandler returns standardized payload', async () => {
  const { errorHandler } = await import('../../dist/middlewares/errorHandler.js');

  const req = {};
  const res = {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };

  errorHandler(new Error('boom'), req, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.error.message, 'boom');
  assert.equal(res.payload.error.code, 'INTERNAL_ERROR');
});
