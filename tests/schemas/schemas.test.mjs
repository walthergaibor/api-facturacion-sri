import test from 'node:test';
import assert from 'node:assert/strict';

test('facturaSchema parses minimal valid payload', async () => {
  const { facturaSchema } = await import('../../dist/schemas/facturaSchema.js');

  const payload = {
    fechaEmision: '08/02/2026',
    comprador: {
      tipoIdentificacion: '05',
      identificacion: '1710034065',
      razonSocial: 'Cliente Demo'
    },
    items: [
      {
        codigoPrincipal: 'P001',
        descripcion: 'Producto',
        cantidad: 1,
        precioUnitario: 10,
        descuento: 0,
        impuestos: [{ codigo: '2', codigoPorcentaje: '2', tarifa: 12 }]
      }
    ]
  };

  const parsed = facturaSchema.parse(payload);
  assert.equal(parsed.items.length, 1);
});

test('notaCreditoSchema fails when docModificado is missing', async () => {
  const { notaCreditoSchema } = await import('../../dist/schemas/notaCreditoSchema.js');

  const result = notaCreditoSchema.safeParse({
    motivo: 'Devolucion',
    items: []
  });

  assert.equal(result.success, false);
});

test('retencionSchema parses valid payload', async () => {
  const { retencionSchema } = await import('../../dist/schemas/retencionSchema.js');

  const payload = {
    fechaEmision: '08/02/2026',
    sujetoRetenido: {
      tipoIdentificacion: '05',
      identificacion: '1710034065',
      razonSocial: 'Proveedor Demo'
    },
    docSustento: {
      codDocSustento: '01',
      numDocSustento: '001001000000123',
      fechaEmisionDocSustento: '08/02/2026'
    },
    retenciones: [
      {
        codigo: '1',
        codigoRetencion: '312',
        baseImponible: 100,
        porcentajeRetener: 1,
        valorRetenido: 1
      }
    ]
  };

  const parsed = retencionSchema.parse(payload);
  assert.equal(parsed.retenciones.length, 1);
});
