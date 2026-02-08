import test from 'node:test';
import assert from 'node:assert/strict';

function makeRes() {
  return {
    statusCode: 200,
    payload: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    send(body) {
      this.payload = body;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };
}

test('comprobanteController lists comprobantes filtered by req.empresaId', async () => {
  const { createComprobanteController } = await import('../../dist/controllers/comprobanteController.js');

  let whereSeen = null;
  const controller = createComprobanteController({
    db: {
      comprobante: {
        findMany: async ({ where }) => {
          whereSeen = where;
          return [{ id: 'c1' }];
        },
        findFirst: async () => null
      }
    },
    autorizacionService: {
      consultarAutorizacion: async () => ({ estado: 'AUTORIZADO' })
    }
  });

  const req = { empresaId: 'empresa-1', query: { estado: 'AUTORIZADO' } };
  const res = makeRes();

  await controller.listComprobantes(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(whereSeen.empresaId, 'empresa-1');
  assert.equal(whereSeen.estado, 'AUTORIZADO');
});

test('comprobanteController returns 404 when claveAcceso does not belong to tenant', async () => {
  const { createComprobanteController } = await import('../../dist/controllers/comprobanteController.js');

  const controller = createComprobanteController({
    db: {
      comprobante: {
        findMany: async () => [],
        findFirst: async () => null
      }
    },
    autorizacionService: {
      consultarAutorizacion: async () => ({ estado: 'AUTORIZADO' })
    }
  });

  const req = { empresaId: 'empresa-1', params: { claveAcceso: 'abc' }, query: {} };
  const res = makeRes();

  await controller.getComprobanteByClave(req, res, () => {});

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.success, false);
});

test('comprobanteController generates ride PDF and stores it when missing', async () => {
  const { createComprobanteController } = await import('../../dist/controllers/comprobanteController.js');

  let uploadedPath = null;
  let updatedRidePdf = null;

  const controller = createComprobanteController({
    db: {
      comprobante: {
        findMany: async () => [],
        findFirst: async () => ({
          id: 'c1',
          empresaId: 'empresa-1',
          tipoDocumento: '01',
          claveAcceso: 'ABC',
          ridePdf: null,
          razonSocialComprador: 'Cliente',
          identificacionComprador: '1710034065',
          respuestaSri: {},
          empresa: { razonSocial: 'Mi Empresa', ruc: '1710034065001' }
        }),
        update: async ({ data }) => {
          updatedRidePdf = data.ridePdf;
          return {};
        }
      },
      empresa: {
        findUnique: async () => ({ id: 'empresa-1', ambiente: '1' })
      }
    },
    autorizacionService: {
      consultarAutorizacion: async () => ({ estado: 'AUTORIZADO' })
    },
    rideServices: {
      factura: {
        generateRideFacturaPdf: async () => Buffer.from('PDF-FACTURA')
      }
    },
    storage: {
      upload: async (path) => {
        uploadedPath = path;
      },
      download: async () => Buffer.from('PDF-EXISTENTE')
    }
  });

  const req = { empresaId: 'empresa-1', params: { claveAcceso: 'ABC' } };
  const res = makeRes();

  await controller.getRidePdf(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'application/pdf');
  assert.equal(Buffer.isBuffer(res.payload), true);
  assert.match(uploadedPath, /empresa-1\/01\/ABC\/ride\.pdf/);
  assert.match(updatedRidePdf, /comprobantes\/empresa-1\/01\/ABC\/ride\.pdf/);
});

test('comprobanteController sends ride+xml to buyer email', async () => {
  const { createComprobanteController } = await import('../../dist/controllers/comprobanteController.js');

  let sentTo = null;
  const controller = createComprobanteController({
    db: {
      comprobante: {
        findMany: async () => [],
        findFirst: async () => ({
          id: 'c1',
          empresaId: 'empresa-1',
          tipoDocumento: '01',
          claveAcceso: 'ABC',
          ridePdf: 'comprobantes/empresa-1/01/ABC/ride.pdf',
          xmlAutorizado: 'comprobantes/empresa-1/01/ABC/autorizado.xml',
          emailComprador: 'cliente@example.com',
          razonSocialComprador: 'Cliente',
          identificacionComprador: '1710034065',
          respuestaSri: {},
          empresa: { razonSocial: 'Mi Empresa', ruc: '1710034065001' }
        }),
        update: async () => ({})
      },
      empresa: {
        findUnique: async () => ({ id: 'empresa-1', ambiente: '1' })
      }
    },
    autorizacionService: {
      consultarAutorizacion: async () => ({ estado: 'AUTORIZADO' })
    },
    rideServices: {
      factura: { generateRideFacturaPdf: async () => Buffer.from('PDF') },
      notaCredito: { generateRideNotaCreditoPdf: async () => Buffer.from('PDF') },
      retencion: { generateRideRetencionPdf: async () => Buffer.from('PDF') }
    },
    storage: {
      upload: async () => {},
      download: async (path) => (String(path).endsWith('.pdf') ? Buffer.from('PDF') : Buffer.from('<xml />'))
    },
    emailService: {
      sendComprobanteEmail: async ({ to }) => {
        sentTo = to;
        return { id: 'mail_1' };
      }
    }
  });

  const req = { empresaId: 'empresa-1', params: { claveAcceso: 'ABC' }, body: {} };
  const res = makeRes();

  await controller.sendComprobanteEmail(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(sentTo, 'cliente@example.com');
});
