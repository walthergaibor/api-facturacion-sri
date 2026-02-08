import test from 'node:test';
import assert from 'node:assert/strict';

test('getNextSecuencial returns 9-digit incremented sequence', async () => {
  const { createSecuencialService } = await import('../../dist/utils/secuencial.js');

  const service = createSecuencialService({
    secuencial: {
      upsert: async () => ({ secuenciaActual: 1 })
    }
  });

  const sec = await service.getNextSecuencial({
    empresaId: 'empresa-1',
    tipoDocumento: '01',
    codEstablecimiento: '001',
    ptoEmision: '001'
  });

  assert.equal(sec, '000000001');
});
