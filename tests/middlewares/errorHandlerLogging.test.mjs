import test from 'node:test';
import assert from 'node:assert/strict';

test('errorHandler logs error details to console', async () => {
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

  let logged = false;
  const original = console.error;
  console.error = () => {
    logged = true;
  };

  try {
    errorHandler(new Error('boom'), req, res, () => {});
  } finally {
    console.error = original;
  }

  assert.equal(logged, true);
  assert.equal(res.statusCode, 500);
});
