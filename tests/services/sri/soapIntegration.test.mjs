import test from 'node:test';
import assert from 'node:assert/strict';

test('soapClient selects wsdl by ambiente and service type', async () => {
  const { createSoapClientService } = await import('../../../dist/services/sri/soapClient.js');
  process.env.SRI_RECEPTION_URL_PRUEBAS = 'https://celcer.sri.gob.ec/recepcion?wsdl';

  let selectedWsdl = '';
  const service = createSoapClientService({
    createClient: async (wsdl) => {
      selectedWsdl = wsdl;
      return { validarComprobanteAsync: async () => [{ estado: 'RECIBIDA' }] };
    },
    sleep: async () => {}
  });

  await service.callSriOperation({
    ambiente: '1',
    serviceType: 'reception',
    operation: 'validarComprobante',
    payload: { xml: 'abc' }
  });

  assert.equal(selectedWsdl, 'https://celcer.sri.gob.ec/recepcion?wsdl');
});

test('soapClient retries failed operation up to 3 times', async () => {
  const { createSoapClientService } = await import('../../../dist/services/sri/soapClient.js');
  process.env.SRI_RECEPTION_URL_PRUEBAS = 'https://celcer.sri.gob.ec/recepcion?wsdl';

  let attempts = 0;
  let sleeps = 0;
  const service = createSoapClientService({
    createClient: async () => ({
      validarComprobanteAsync: async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('temp fail');
        return [{ estado: 'RECIBIDA' }];
      }
    }),
    sleep: async () => {
      sleeps += 1;
    }
  });

  const result = await service.callSriOperation({
    ambiente: '1',
    serviceType: 'reception',
    operation: 'validarComprobante',
    payload: { xml: 'abc' }
  });

  assert.equal(attempts, 3);
  assert.equal(sleeps, 2);
  assert.equal(result.estado, 'RECIBIDA');
});

test('recepcion sends signed xml as base64 and parses status', async () => {
  const { createRecepcionService } = await import('../../../dist/services/sri/recepcion.js');

  let seenPayload = null;
  const service = createRecepcionService({
    soapClient: {
      callSriOperation: async ({ payload }) => {
        seenPayload = payload;
        return {
          RespuestaRecepcionComprobante: {
            estado: 'DEVUELTA',
            comprobantes: {
              comprobante: [{ mensajes: { mensaje: [{ identificador: '43', mensaje: 'Error' }] } }]
            }
          }
        };
      }
    }
  });

  const result = await service.enviarComprobanteFirmado({ ambiente: '1', xmlFirmado: '<xml>ok</xml>' });

  assert.equal(typeof seenPayload.xml, 'string');
  assert.equal(result.estado, 'DEVUELTA');
  assert.equal(result.mensajes.length, 1);
});

test('autorizacion parses AUTORIZADO response and returns xml', async () => {
  const { createAutorizacionService } = await import('../../../dist/services/sri/autorizacion.js');

  const service = createAutorizacionService({
    soapClient: {
      callSriOperation: async () => ({
        RespuestaAutorizacionComprobante: {
          autorizaciones: {
            autorizacion: [
              {
                estado: 'AUTORIZADO',
                numeroAutorizacion: '123',
                fechaAutorizacion: '2026-02-08T12:00:00',
                comprobante: '<factura />',
                mensajes: null
              }
            ]
          }
        }
      })
    }
  });

  const result = await service.consultarAutorizacion({ ambiente: '1', claveAcceso: '123' });

  assert.equal(result.estado, 'AUTORIZADO');
  assert.equal(result.xmlAutorizado, '<factura />');
});
