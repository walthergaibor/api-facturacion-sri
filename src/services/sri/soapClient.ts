import soap from 'soap';

type Ambiente = '1' | '2';
type SriServiceType = 'reception' | 'authorization';

type CallOperationInput = {
  ambiente: Ambiente | string;
  serviceType: SriServiceType;
  operation: string;
  payload: Record<string, unknown>;
};

type SoapClientDeps = {
  createClient: (wsdlUrl: string, timeoutMs: number) => Promise<any>;
  sleep: (ms: number) => Promise<void>;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_ATTEMPTS = 3;

function resolveWsdlUrl(serviceType: SriServiceType, ambiente: Ambiente | string): string {
  if (serviceType === 'reception') {
    return ambiente === '2'
      ? process.env.SRI_RECEPTION_URL_PRODUCCION ?? ''
      : process.env.SRI_RECEPTION_URL_PRUEBAS ?? '';
  }

  return ambiente === '2'
    ? process.env.SRI_AUTHORIZATION_URL_PRODUCCION ?? ''
    : process.env.SRI_AUTHORIZATION_URL_PRUEBAS ?? '';
}

const defaultDeps: SoapClientDeps = {
  createClient: async (wsdlUrl: string, timeoutMs: number) => {
    return soap.createClientAsync(wsdlUrl, {
      wsdl_options: {
        timeout: timeoutMs
      }
    });
  },
  sleep: async (ms: number) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
};

function getBackoffMs(attempt: number): number {
  if (attempt <= 1) return 5_000;
  if (attempt === 2) return 15_000;
  return 45_000;
}

export function createSoapClientService(customDeps: Partial<SoapClientDeps> = {}) {
  const deps = { ...defaultDeps, ...customDeps };

  return {
    async callSriOperation(input: CallOperationInput): Promise<any> {
      const wsdlUrl = resolveWsdlUrl(input.serviceType, input.ambiente);
      if (!wsdlUrl) {
        throw new Error(`WSDL URL no configurada para ${input.serviceType} ambiente ${input.ambiente}`);
      }

      let lastError: unknown;
      for (let attempt = 1; attempt <= DEFAULT_MAX_ATTEMPTS; attempt += 1) {
        try {
          const client = await deps.createClient(wsdlUrl, DEFAULT_TIMEOUT_MS);
          const asyncMethod = client?.[`${input.operation}Async`];
          if (typeof asyncMethod !== 'function') {
            throw new Error(`SOAP operation not found: ${input.operation}Async`);
          }

          const raw = await asyncMethod.call(client, input.payload);
          if (Array.isArray(raw)) {
            return raw[0];
          }
          return raw;
        } catch (error) {
          lastError = error;
          if (attempt < DEFAULT_MAX_ATTEMPTS) {
            await deps.sleep(getBackoffMs(attempt));
          }
        }
      }

      throw lastError;
    }
  };
}

export const soapClientService = createSoapClientService();
