import test from 'node:test';
import assert from 'node:assert/strict';

function makeRes() {
  return {
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
}

test('validateRequest calls next when schema succeeds', async () => {
  const { validateRequest } = await import('../../dist/middlewares/validateRequest.js');

  const req = { body: { ok: true } };
  const res = makeRes();
  let nextCalled = false;

  const middleware = validateRequest({
    body: {
      safeParse: () => ({ success: true, data: { ok: true, normalized: true } })
    }
  });

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.body.normalized, true);
});

test('validateRequest returns 400 when schema fails', async () => {
  const { validateRequest } = await import('../../dist/middlewares/validateRequest.js');

  const req = { body: { ok: false } };
  const res = makeRes();
  let nextCalled = false;

  const middleware = validateRequest({
    body: {
      safeParse: () => ({
        success: false,
        error: {
          flatten: () => ({ fieldErrors: { ok: ['invalid'] }, formErrors: [] })
        }
      })
    }
  });

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.error.code, 'VALIDATION_ERROR');
});
