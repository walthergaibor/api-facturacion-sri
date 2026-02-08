import test from 'node:test';
import assert from 'node:assert/strict';

test('calcularModulo10 and calcularModulo11 return check digits', async () => {
  const { calcularModulo10, calcularModulo11 } = await import('../../dist/utils/validators.js');

  assert.equal(typeof calcularModulo10('1710034065'), 'number');
  assert.equal(typeof calcularModulo11('1790012394001'), 'number');
});

test('validarCedula returns true for valid-ish format and false for malformed', async () => {
  const { validarCedula } = await import('../../dist/utils/validators.js');

  assert.equal(validarCedula('1710034065'), true);
  assert.equal(validarCedula('1234'), false);
  assert.equal(validarCedula('abcdefghij'), false);
});

test('validarRuc returns false for malformed values', async () => {
  const { validarRuc } = await import('../../dist/utils/validators.js');

  assert.equal(validarRuc('1710034065001'), true);
  assert.equal(validarRuc('1790012394'), false);
  assert.equal(validarRuc('0000000000000'), false);
});
