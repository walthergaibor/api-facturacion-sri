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

test('requireAdmin allows request when req.isAdmin is true', async () => {
  const { requireAdmin } = await import('../../dist/middlewares/requireAdmin.js');
  const req = { isAdmin: true };
  const res = makeRes();
  let nextCalled = false;

  requireAdmin(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('requireAdmin rejects non-admin request with 403', async () => {
  const { requireAdmin } = await import('../../dist/middlewares/requireAdmin.js');
  const req = { isAdmin: false };
  const res = makeRes();
  let nextCalled = false;

  requireAdmin(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.error.code, 'FORBIDDEN');
});
