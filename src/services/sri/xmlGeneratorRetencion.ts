import { create } from 'xmlbuilder2';

type KeyValue = Record<string, string | number | undefined | null>;

type Retencion = {
  codigo: string;
  codigoRetencion: string;
  baseImponible: string;
  porcentajeRetener: string;
  valorRetenido: string;
};

type DocSustento = {
  codSustento: string;
  codDocSustento: string;
  numDocSustento: string;
  fechaEmisionDocSustento: string;
  pagos?: Array<Record<string, string>>;
  impuestosDocSustento?: Array<Record<string, string>>;
  retenciones: Retencion[];
};

type Adicional = {
  nombre: string;
  valor: string;
};

type RetencionXmlInput = {
  infoTributaria: KeyValue;
  infoCompRetencion: KeyValue;
  docsSustento: DocSustento[];
  infoAdicional?: Adicional[];
};

function appendObjectNode(parent: any, nodeName: string, data: KeyValue): void {
  const node = parent.ele(nodeName);
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null && value !== '') {
      node.ele(key).txt(String(value));
    }
  }
}

export function generateRetencionXml(input: RetencionXmlInput): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' });
  const comprobante = doc.ele('comprobanteRetencion', { id: 'comprobante', version: '2.0.0' });

  appendObjectNode(comprobante, 'infoTributaria', input.infoTributaria);
  appendObjectNode(comprobante, 'infoCompRetencion', input.infoCompRetencion);

  const docsSustento = comprobante.ele('docsSustento');
  for (const docSustentoInput of input.docsSustento) {
    const docSustento = docsSustento.ele('docSustento');
    docSustento.ele('codSustento').txt(docSustentoInput.codSustento);
    docSustento.ele('codDocSustento').txt(docSustentoInput.codDocSustento);
    docSustento.ele('numDocSustento').txt(docSustentoInput.numDocSustento);
    docSustento.ele('fechaEmisionDocSustento').txt(docSustentoInput.fechaEmisionDocSustento);

    if (docSustentoInput.pagos?.length) {
      const pagos = docSustento.ele('pagos');
      for (const pagoInput of docSustentoInput.pagos) {
        const pago = pagos.ele('pago');
        for (const [k, v] of Object.entries(pagoInput)) {
          pago.ele(k).txt(String(v));
        }
      }
    }

    if (docSustentoInput.impuestosDocSustento?.length) {
      const impuestos = docSustento.ele('impuestosDocSustento');
      for (const impuestoInput of docSustentoInput.impuestosDocSustento) {
        const impuesto = impuestos.ele('impuestoDocSustento');
        for (const [k, v] of Object.entries(impuestoInput)) {
          impuesto.ele(k).txt(String(v));
        }
      }
    }

    const retenciones = docSustento.ele('retenciones');
    for (const retencionInput of docSustentoInput.retenciones) {
      const retencion = retenciones.ele('retencion');
      retencion.ele('codigo').txt(retencionInput.codigo);
      retencion.ele('codigoRetencion').txt(retencionInput.codigoRetencion);
      retencion.ele('baseImponible').txt(retencionInput.baseImponible);
      retencion.ele('porcentajeRetener').txt(retencionInput.porcentajeRetener);
      retencion.ele('valorRetenido').txt(retencionInput.valorRetenido);
    }
  }

  if (input.infoAdicional?.length) {
    const infoAdicional = comprobante.ele('infoAdicional');
    for (const adicional of input.infoAdicional) {
      infoAdicional.ele('campoAdicional', { nombre: adicional.nombre }).txt(adicional.valor);
    }
  }

  return doc.end({ prettyPrint: true });
}
