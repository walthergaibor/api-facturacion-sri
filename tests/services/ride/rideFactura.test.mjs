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

test('rideFactura generates a PDF-like buffer with main sections', async () => {
  const { createRideFacturaService } = await import('../../../dist/services/ride/rideFactura.js');

  const service = createRideFacturaService({
    createPdfDoc: async () => createFakePdfDoc()
  });

  const pdf = await service.generateRideFacturaPdf({
    claveAcceso: '1234567890',
    emisor: { razonSocial: 'Mi Empresa', ruc: '1710034065001' },
    comprador: { razonSocial: 'Cliente Demo', identificacion: '1710034065' },
    items: [{ descripcion: 'Servicio', cantidad: '1', precioUnitario: '10.00', total: '10.00' }],
    totales: { subtotal: '10.00', impuestos: '1.20', total: '11.20' }
  });

  const rendered = pdf.toString('utf8');
  assert.match(rendered, /RIDE FACTURA/);
  assert.match(rendered, /1234567890/);
  assert.match(rendered, /Mi Empresa/);
});
