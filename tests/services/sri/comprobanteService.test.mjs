import test from 'node:test';
import assert from 'node:assert/strict';

test('comprobanteService emits factura with tenant-aware flow', async () => {
  const { createComprobanteService } = await import('../../../dist/services/sri/comprobanteService.js');

  const createdRecords = [];
  const uploaded = [];

  const service = createComprobanteService({
    db: {
      empresa: {
        findUnique: async () => ({
          id: 'empresa-1',
          ruc: '1710034065001',
          ambiente: '1',
          codEstablecimiento: '001',
          ptoEmision: '001'
        })
      },
      comprobante: {
        create: async ({ data }) => {
          createdRecords.push(data);
          return { id: 'comp-1', ...data };
        }
      }
    },
    secuencialService: {
      getNextSecuencial: async () => '000000001'
    },
    claveAcceso: {
      generarClaveAcceso: () => '1234567890123456789012345678901234567890123456789'
    },
    xmlGenerators: {
      factura: () => '<factura />',
      notaCredito: () => '<notaCredito />',
      retencion: () => '<retencion />'
    },
    firmaService: {
      signXmlForEmpresa: async () => '<signed />'
    },
    recepcionService: {
      enviarComprobanteFirmado: async () => ({ estado: 'RECIBIDA', mensajes: [] })
    },
    autorizacionService: {
      consultarAutorizacion: async () => ({ estado: 'AUTORIZADO', xmlAutorizado: '<auth />' })
    },
    storage: {
      upload: async (path, content) => {
        uploaded.push({ path, content });
      }
    },
    now: () => new Date('2026-02-08T12:00:00Z')
  });

  const result = await service.emitirFactura({
    empresaId: 'empresa-1',
    data: { cliente: { identificacion: '1710034065', razonSocial: 'Cliente' }, items: [] }
  });

  assert.equal(result.claveAcceso.length, 49);
  assert.equal(result.estado, 'AUTORIZADO');
  assert.equal(createdRecords.length, 1);
  assert.equal(createdRecords[0].empresaId, 'empresa-1');
  assert.equal(uploaded.length >= 1, true);
});
