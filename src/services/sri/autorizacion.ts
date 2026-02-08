import { soapClientService } from './soapClient.js';

type AutorizacionDeps = {
  soapClient: {
    callSriOperation: (input: {
      ambiente: string;
      serviceType: 'authorization';
      operation: 'autorizacionComprobante';
      payload: { claveAccesoComprobante: string };
    }) => Promise<any>;
  };
};

type ConsultarInput = {
  ambiente: string;
  claveAcceso: string;
};

function normalizeAutorizaciones(raw: any): any[] {
  const auths = raw?.autorizaciones?.autorizacion;
  if (!auths) return [];
  return Array.isArray(auths) ? auths : [auths];
}

export function createAutorizacionService(customDeps: Partial<AutorizacionDeps> = {}) {
  const deps: AutorizacionDeps = {
    soapClient: soapClientService,
    ...customDeps
  };

  return {
    async consultarAutorizacion(input: ConsultarInput) {
      const response = await deps.soapClient.callSriOperation({
        ambiente: input.ambiente,
        serviceType: 'authorization',
        operation: 'autorizacionComprobante',
        payload: { claveAccesoComprobante: input.claveAcceso }
      });

      const raw = response?.RespuestaAutorizacionComprobante ?? response;
      const autorizaciones = normalizeAutorizaciones(raw);
      const principal = autorizaciones[0] ?? null;

      return {
        estado: principal?.estado ?? 'EN_PROCESAMIENTO',
        autorizacion: principal,
        xmlAutorizado: principal?.comprobante ?? null,
        mensajes: principal?.mensajes ?? null,
        raw
      };
    }
  };
}

export const autorizacionService = createAutorizacionService();
