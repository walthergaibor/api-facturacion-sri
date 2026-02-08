import test from 'node:test';
import assert from 'node:assert/strict';

test('generates 49-digit clave de acceso with valid modulo 11 check digit', async () => {
  const { generarClaveAcceso, calcularDigitoVerificadorModulo11 } = await import('../../dist/utils/claveAcceso.js');

  const clave = generarClaveAcceso({
    fechaEmision: '2026-02-08',
    tipoDocumento: '01',
    ruc: '0999999999001',
    ambiente: '1',
    serie: '001001',
    secuencial: '000000123',
    codigoNumerico: '12345678',
    tipoEmision: '1'
  });

  assert.match(clave, /^\d{49}$/);
  const base = clave.slice(0, 48);
  const dv = Number(clave.slice(48));
  assert.equal(dv, calcularDigitoVerificadorModulo11(base));
});

test('throws when inputs are invalid length', async () => {
  const { generarClaveAcceso } = await import('../../dist/utils/claveAcceso.js');

  assert.throws(() =>
    generarClaveAcceso({
      fechaEmision: '2026-02-08',
      tipoDocumento: '1',
      ruc: '099',
      ambiente: '1',
      serie: '001001',
      secuencial: '000000123',
      codigoNumerico: '12345678',
      tipoEmision: '1'
    })
  );
});
