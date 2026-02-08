import test from 'node:test';
import assert from 'node:assert/strict';

test('tiposIdentificacion contains required SRI codes', async () => {
  const { tiposIdentificacion } = await import('../../dist/catalogs/tiposIdentificacion.js');

  assert.equal(tiposIdentificacion['04'].nombre, 'RUC');
  assert.equal(tiposIdentificacion['05'].nombre, 'Cedula');
  assert.equal(tiposIdentificacion['06'].nombre, 'Pasaporte');
  assert.equal(tiposIdentificacion['07'].nombre, 'Consumidor Final');
  assert.equal(tiposIdentificacion['08'].nombre, 'Identificacion del Exterior');
});

test('tiposImpuesto includes IVA with expected tariffs', async () => {
  const { tiposImpuesto } = await import('../../dist/catalogs/tiposImpuesto.js');

  assert.equal(tiposImpuesto.IVA.codigo, '2');
  assert.deepEqual(tiposImpuesto.IVA.tarifas, [0, 5, 12, 15]);
  assert.equal(tiposImpuesto.ICE.codigo, '3');
  assert.equal(tiposImpuesto.IRBPNR.codigo, '5');
});

test('formasPago includes expected SRI payment methods', async () => {
  const { formasPago } = await import('../../dist/catalogs/formasPago.js');

  assert.equal(formasPago['01'].nombre, 'Sin utilizacion del sistema financiero');
  assert.equal(formasPago['15'].nombre, 'Compensacion de deudas');
  assert.equal(formasPago['16'].nombre, 'Tarjeta de debito');
  assert.equal(formasPago['17'].nombre, 'Dinero electronico');
  assert.equal(formasPago['18'].nombre, 'Tarjeta prepago');
  assert.equal(formasPago['19'].nombre, 'Tarjeta de credito');
  assert.equal(formasPago['20'].nombre, 'Otros');
});
