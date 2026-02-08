import { soapClientService } from './soapClient.js';

type RecepcionDeps = {
  soapClient: {
    callSriOperation: (input: {
      ambiente: string;
      serviceType: 'reception';
      operation: 'validarComprobante';
      payload: { xml: string };
    }) => Promise<any>;
  };
};

type EnviarInput = {
  ambiente: string;
  xmlFirmado: string;
};

function normalizeMensajes(raw: any): any[] {
  const mensajes = raw?.comprobantes?.comprobante?.[0]?.mensajes?.mensaje;
  if (!mensajes) return [];
  return Array.isArray(mensajes) ? mensajes : [mensajes];
}

export function createRecepcionService(customDeps: Partial<RecepcionDeps> = {}) {
  const deps: RecepcionDeps = {
    soapClient: soapClientService,
    ...customDeps
  };

  return {
    async enviarComprobanteFirmado(input: EnviarInput) {
      const xmlBase64 = Buffer.from(input.xmlFirmado, 'utf8').toString('base64');
      const response = await deps.soapClient.callSriOperation({
        ambiente: input.ambiente,
        serviceType: 'reception',
        operation: 'validarComprobante',
        payload: { xml: xmlBase64 }
      });

      const raw = response?.RespuestaRecepcionComprobante ?? response;
      return {
        estado: raw?.estado ?? 'ERROR',
        mensajes: normalizeMensajes(raw),
        raw
      };
    }
  };
}

export const recepcionService = createRecepcionService();
