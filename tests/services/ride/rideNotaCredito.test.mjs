import test from 'node:test';
import assert from 'node:assert/strict';

function createFakePdfDoc() {
  let output = '';
  let targetStream = null;

  return {
    fontSize() {
      return this;
    },
    text(value) {
      output += `${String(value)}\n`;
      return this;
    },
    moveDown() {
      output += '\n';
      return this;
    },
    pipe(stream) {
      targetStream = stream;
      return stream;
    },
    end() {
      targetStream.end(output);
    }
  };
}

test('rideNotaCredito generates a PDF-like buffer with modified document info', async () => {
  const { createRideNotaCreditoService } = await import('../../../dist/services/ride/rideNotaCredito.js');

  const service = createRideNotaCreditoService({
    createPdfDoc: async () => createFakePdfDoc()
  });

  const pdf = await service.generateRideNotaCreditoPdf({
    claveAcceso: '9876543210',
    emisor: { razonSocial: 'Mi Empresa', ruc: '1710034065001' },
    comprador: { razonSocial: 'Cliente Demo', identificacion: '1710034065' },
    docModificado: { numero: '001-001-000000123', fechaEmision: '2026-02-08' },
    motivo: 'Devolucion parcial',
    items: [{ descripcion: 'Producto', cantidad: '1', precioUnitario: '10.00', total: '10.00' }],
    totales: { subtotal: '10.00', impuestos: '1.20', total: '11.20' }
  });

  const rendered = pdf.toString('utf8');
  assert.match(rendered, /RIDE NOTA DE CREDITO/);
  assert.match(rendered, /001-001-000000123/);
  assert.match(rendered, /Devolucion parcial/);
});
