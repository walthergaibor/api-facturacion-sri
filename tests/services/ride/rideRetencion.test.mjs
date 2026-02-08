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

test('rideRetencion generates a PDF-like buffer with sustento info', async () => {
  const { createRideRetencionService } = await import('../../../dist/services/ride/rideRetencion.js');

  const service = createRideRetencionService({
    createPdfDoc: async () => createFakePdfDoc()
  });

  const pdf = await service.generateRideRetencionPdf({
    claveAcceso: '555666777',
    emisor: { razonSocial: 'Mi Empresa', ruc: '1710034065001' },
    sujetoRetenido: { razonSocial: 'Proveedor Demo', identificacion: '1790012345001' },
    retenciones: [{ codigo: '1', codigoRetencion: '312', baseImponible: '100.00', valorRetenido: '1.00' }],
    periodoFiscal: '02/2026'
  });

  const rendered = pdf.toString('utf8');
  assert.match(rendered, /RIDE RETENCION/);
  assert.match(rendered, /555666777/);
  assert.match(rendered, /02\/2026/);
});
