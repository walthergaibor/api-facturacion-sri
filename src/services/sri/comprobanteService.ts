import { getPrismaClient } from '../../config/prisma.js';
import { generarClaveAcceso } from '../../utils/claveAcceso.js';
import { createSecuencialService } from '../../utils/secuencial.js';
import { autorizacionService } from './autorizacion.js';
import { getFirmaElectronicaService } from './firmaElectronica.js';
import { recepcionService } from './recepcion.js';
import { generateFacturaXml } from './xmlGeneratorFactura.js';
import { generateNotaCreditoXml } from './xmlGeneratorNotaCredito.js';
import { generateRetencionXml } from './xmlGeneratorRetencion.js';

type TipoDocumento = '01' | '04' | '07';

type EmpresaRecord = {
  id: string;
  ruc: string;
  ambiente?: string;
  codEstablecimiento?: string;
  ptoEmision?: string;
  tipoEmision?: string;
};

type EmitResult = {
  claveAcceso: string;
  estado: string;
  autorizacion: unknown;
  comprobanteId: string;
};

type ComprobanteServiceDeps = {
  db: {
    empresa: {
      findUnique: (args: { where: { id: string } }) => Promise<EmpresaRecord | null>;
    };
    comprobante: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    };
  };
  secuencialService: {
    getNextSecuencial: (input: {
      empresaId: string;
      tipoDocumento: string;
      codEstablecimiento: string;
      ptoEmision: string;
    }) => Promise<string>;
  };
  claveAcceso: {
    generarClaveAcceso: (input: {
      fechaEmision: string;
      tipoDocumento: string;
      ruc: string;
      ambiente: string;
      serie: string;
      secuencial: string;
      codigoNumerico: string;
      tipoEmision: string;
    }) => string;
  };
  xmlGenerators: {
    factura: (data: any) => string;
    notaCredito: (data: any) => string;
    retencion: (data: any) => string;
  };
  firmaService: {
    signXmlForEmpresa: (input: { empresaId: string; tipoDocumento: string; xml: string }) => Promise<string>;
  };
  recepcionService: {
    enviarComprobanteFirmado: (input: { ambiente: string; xmlFirmado: string }) => Promise<any>;
  };
  autorizacionService: {
    consultarAutorizacion: (input: { ambiente: string; claveAcceso: string }) => Promise<any>;
  };
  storage: {
    upload: (path: string, content: string) => Promise<void>;
  };
  now: () => Date;
};

type EmitInput = {
  empresaId: string;
  data: Record<string, any>;
};

function buildCodigoNumerico(now: Date): string {
  return String(now.getTime() % 100_000_000).padStart(8, '0');
}

function pickComprador(data: Record<string, any>): {
  identificacionComprador: string;
  razonSocialComprador: string;
  emailComprador?: string;
} {
  const cliente = data.cliente ?? {};
  const identificacion =
    data.identificacionComprador ?? cliente.identificacion ?? data.docModificado?.identificacionComprador ?? '9999999999999';
  const razonSocial =
    data.razonSocialComprador ?? cliente.razonSocial ?? data.docModificado?.razonSocialComprador ?? 'CONSUMIDOR FINAL';

  return {
    identificacionComprador: String(identificacion),
    razonSocialComprador: String(razonSocial),
    emailComprador: data.emailComprador ?? cliente.email
  };
}

function buildFacturaXmlPayload(input: {
  empresa: EmpresaRecord;
  fechaEmision: Date;
  claveAcceso: string;
  secuencial: string;
  data: Record<string, any>;
}) {
  return {
    infoTributaria: {
      ambiente: input.empresa.ambiente ?? '1',
      tipoEmision: input.empresa.tipoEmision ?? '1',
      razonSocial: input.data.emisor?.razonSocial ?? '',
      nombreComercial: input.data.emisor?.nombreComercial ?? '',
      ruc: input.empresa.ruc,
      claveAcceso: input.claveAcceso,
      codDoc: '01',
      estab: input.empresa.codEstablecimiento ?? '001',
      ptoEmi: input.empresa.ptoEmision ?? '001',
      secuencial: input.secuencial,
      dirMatriz: input.data.emisor?.direccionMatriz ?? ''
    },
    infoFactura: {
      fechaEmision: input.data.fechaEmision ?? input.fechaEmision.toISOString().slice(0, 10),
      dirEstablecimiento: input.data.emisor?.direccionEstablecimiento ?? '',
      obligadoContabilidad: input.data.emisor?.obligadoContabilidad ? 'SI' : 'NO',
      tipoIdentificacionComprador: input.data.cliente?.tipoIdentificacion ?? '05',
      razonSocialComprador: input.data.cliente?.razonSocial ?? '',
      identificacionComprador: input.data.cliente?.identificacion ?? '',
      totalSinImpuestos: input.data.totales?.totalSinImpuestos ?? '0.00',
      totalDescuento: input.data.totales?.totalDescuento ?? '0.00',
      propina: input.data.totales?.propina ?? '0.00',
      importeTotal: input.data.totales?.importeTotal ?? '0.00',
      moneda: 'DOLAR'
    },
    totalConImpuestos: input.data.totalConImpuestos ?? [],
    detalles: input.data.items ?? [],
    infoAdicional: input.data.infoAdicional ?? []
  };
}

function buildNotaCreditoXmlPayload(input: {
  empresa: EmpresaRecord;
  fechaEmision: Date;
  claveAcceso: string;
  secuencial: string;
  data: Record<string, any>;
}) {
  return {
    infoTributaria: {
      ambiente: input.empresa.ambiente ?? '1',
      tipoEmision: input.empresa.tipoEmision ?? '1',
      ruc: input.empresa.ruc,
      claveAcceso: input.claveAcceso,
      codDoc: '04',
      estab: input.empresa.codEstablecimiento ?? '001',
      ptoEmi: input.empresa.ptoEmision ?? '001',
      secuencial: input.secuencial
    },
    infoNotaCredito: {
      fechaEmision: input.data.fechaEmision ?? input.fechaEmision.toISOString().slice(0, 10),
      tipoIdentificacionComprador: input.data.cliente?.tipoIdentificacion ?? '05',
      razonSocialComprador: input.data.cliente?.razonSocial ?? '',
      identificacionComprador: input.data.cliente?.identificacion ?? '',
      codDocModificado: input.data.docModificado?.codDocModificado ?? '',
      numDocModificado: input.data.docModificado?.numDocModificado ?? '',
      fechaEmisionDocSustento: input.data.docModificado?.fechaEmisionDocSustento ?? '',
      valorModificacion: input.data.totales?.valorModificacion ?? '0.00',
      motivo: input.data.motivo ?? ''
    },
    totalConImpuestos: input.data.totalConImpuestos ?? [],
    detalles: input.data.items ?? [],
    infoAdicional: input.data.infoAdicional ?? []
  };
}

function buildRetencionXmlPayload(input: {
  empresa: EmpresaRecord;
  fechaEmision: Date;
  claveAcceso: string;
  secuencial: string;
  data: Record<string, any>;
}) {
  return {
    infoTributaria: {
      ambiente: input.empresa.ambiente ?? '1',
      tipoEmision: input.empresa.tipoEmision ?? '1',
      ruc: input.empresa.ruc,
      claveAcceso: input.claveAcceso,
      codDoc: '07',
      estab: input.empresa.codEstablecimiento ?? '001',
      ptoEmi: input.empresa.ptoEmision ?? '001',
      secuencial: input.secuencial
    },
    infoCompRetencion: {
      fechaEmision: input.data.fechaEmision ?? input.fechaEmision.toISOString().slice(0, 10),
      dirEstablecimiento: input.data.emisor?.direccionEstablecimiento ?? '',
      tipoIdentificacionSujetoRetenido: input.data.sujeto?.tipoIdentificacion ?? '05',
      razonSocialSujetoRetenido: input.data.sujeto?.razonSocial ?? '',
      identificacionSujetoRetenido: input.data.sujeto?.identificacion ?? '',
      periodoFiscal: input.data.periodoFiscal ?? ''
    },
    docsSustento: input.data.docsSustento ?? [],
    infoAdicional: input.data.infoAdicional ?? []
  };
}

export function createComprobanteService(customDeps: Partial<ComprobanteServiceDeps> = {}) {
  const db = (customDeps.db ?? (getPrismaClient() as any)) as ComprobanteServiceDeps['db'];
  const deps: ComprobanteServiceDeps = {
    db,
    secuencialService: customDeps.secuencialService ?? createSecuencialService(db as any),
    claveAcceso: customDeps.claveAcceso ?? { generarClaveAcceso },
    xmlGenerators: customDeps.xmlGenerators ?? {
      factura: generateFacturaXml,
      notaCredito: generateNotaCreditoXml,
      retencion: generateRetencionXml
    },
    firmaService: customDeps.firmaService ?? getFirmaElectronicaService(),
    recepcionService: customDeps.recepcionService ?? recepcionService,
    autorizacionService: customDeps.autorizacionService ?? autorizacionService,
    storage:
      customDeps.storage ??
      {
        async upload(path: string, content: string): Promise<void> {
          const { supabase } = await import('../../config/supabase.js');
          const { error } = await supabase.storage.from('comprobantes').upload(path, Buffer.from(content, 'utf8'), {
            upsert: true,
            contentType: 'application/xml'
          });
          if (error) {
            throw new Error(`No se pudo subir archivo a storage: ${error.message}`);
          }
        }
      },
    now: customDeps.now ?? (() => new Date())
  };

  async function emitir(tipoDocumento: TipoDocumento, input: EmitInput): Promise<EmitResult> {
    const empresa = await deps.db.empresa.findUnique({ where: { id: input.empresaId } });
    if (!empresa) {
      throw new Error('Empresa no encontrada');
    }

    const codEstablecimiento = empresa.codEstablecimiento ?? '001';
    const ptoEmision = empresa.ptoEmision ?? '001';
    const ambiente = empresa.ambiente ?? '1';
    const tipoEmision = empresa.tipoEmision ?? '1';

    const secuencial = await deps.secuencialService.getNextSecuencial({
      empresaId: input.empresaId,
      tipoDocumento,
      codEstablecimiento,
      ptoEmision
    });

    const now = deps.now();
    const claveAcceso = deps.claveAcceso.generarClaveAcceso({
      fechaEmision: now.toISOString(),
      tipoDocumento,
      ruc: empresa.ruc,
      ambiente,
      serie: `${codEstablecimiento}${ptoEmision}`,
      secuencial,
      codigoNumerico: buildCodigoNumerico(now),
      tipoEmision
    });

    const xmlPayload =
      tipoDocumento === '01'
        ? buildFacturaXmlPayload({ empresa, fechaEmision: now, claveAcceso, secuencial, data: input.data })
        : tipoDocumento === '04'
          ? buildNotaCreditoXmlPayload({ empresa, fechaEmision: now, claveAcceso, secuencial, data: input.data })
          : buildRetencionXmlPayload({ empresa, fechaEmision: now, claveAcceso, secuencial, data: input.data });

    const xmlGenerado =
      tipoDocumento === '01'
        ? deps.xmlGenerators.factura(xmlPayload)
        : tipoDocumento === '04'
          ? deps.xmlGenerators.notaCredito(xmlPayload)
          : deps.xmlGenerators.retencion(xmlPayload);

    const xmlFirmado = await deps.firmaService.signXmlForEmpresa({
      empresaId: input.empresaId,
      tipoDocumento,
      xml: xmlGenerado
    });

    const recepcion = await deps.recepcionService.enviarComprobanteFirmado({
      ambiente,
      xmlFirmado
    });

    const autorizacion = await deps.autorizacionService.consultarAutorizacion({
      ambiente,
      claveAcceso
    });

    const storageBasePath = `${input.empresaId}/${tipoDocumento}/${claveAcceso}`;
    const xmlGeneradoPath = `${storageBasePath}/generado.xml`;
    const xmlFirmadoPath = `${storageBasePath}/firmado.xml`;
    const xmlAutorizadoPath = `${storageBasePath}/autorizado.xml`;

    await deps.storage.upload(xmlGeneradoPath, xmlGenerado);
    await deps.storage.upload(xmlFirmadoPath, xmlFirmado);
    if (autorizacion?.xmlAutorizado) {
      await deps.storage.upload(xmlAutorizadoPath, String(autorizacion.xmlAutorizado));
    }

    const comprador = pickComprador(input.data);
    const comprobante = await deps.db.comprobante.create({
      data: {
        empresaId: input.empresaId,
        tipoDocumento,
        claveAcceso,
        secuencial,
        fechaEmision: now,
        estado: autorizacion?.estado ?? recepcion?.estado ?? 'ENVIADO',
        xmlGenerado: `comprobantes/${xmlGeneradoPath}`,
        xmlFirmado: `comprobantes/${xmlFirmadoPath}`,
        xmlAutorizado: autorizacion?.xmlAutorizado ? `comprobantes/${xmlAutorizadoPath}` : null,
        respuestaSri: {
          recepcion,
          autorizacion
        },
        identificacionComprador: comprador.identificacionComprador,
        razonSocialComprador: comprador.razonSocialComprador,
        emailComprador: comprador.emailComprador,
        totalSinImpuestos: input.data.totales?.totalSinImpuestos,
        totalConImpuestos: input.data.totales?.totalConImpuestos,
        importeTotal: input.data.totales?.importeTotal,
        moneda: input.data.moneda ?? 'DOLAR'
      }
    });

    return {
      claveAcceso,
      estado: autorizacion?.estado ?? recepcion?.estado ?? 'ENVIADO',
      autorizacion: autorizacion?.autorizacion ?? null,
      comprobanteId: comprobante.id
    };
  }

  return {
    emitirFactura: async (input: EmitInput) => emitir('01', input),
    emitirNotaCredito: async (input: EmitInput) => emitir('04', input),
    emitirRetencion: async (input: EmitInput) => emitir('07', input)
  };
}

let defaultService: ReturnType<typeof createComprobanteService> | null = null;

export function getComprobanteService() {
  if (!defaultService) {
    defaultService = createComprobanteService();
  }
  return defaultService;
}
