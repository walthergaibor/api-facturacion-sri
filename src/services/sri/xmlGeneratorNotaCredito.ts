import { create } from 'xmlbuilder2';

type KeyValue = Record<string, string | number | undefined | null>;

type Impuesto = {
  codigo: string;
  codigoPorcentaje: string;
  tarifa?: string;
  baseImponible: string;
  valor: string;
};

type Detalle = {
  codigoInterno?: string;
  codigoAdicional?: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  descuento: string;
  precioTotalSinImpuesto: string;
  impuestos: Impuesto[];
};

type Adicional = {
  nombre: string;
  valor: string;
};

type NotaCreditoXmlInput = {
  infoTributaria: KeyValue;
  infoNotaCredito: KeyValue;
  totalConImpuestos: Impuesto[];
  detalles: Detalle[];
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

export function generateNotaCreditoXml(input: NotaCreditoXmlInput): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' });
  const notaCredito = doc.ele('notaCredito', { id: 'comprobante', version: '1.1.0' });

  appendObjectNode(notaCredito, 'infoTributaria', input.infoTributaria);

  const infoNotaCredito = notaCredito.ele('infoNotaCredito');
  for (const [key, value] of Object.entries(input.infoNotaCredito)) {
    if (value !== undefined && value !== null && value !== '') {
      infoNotaCredito.ele(key).txt(String(value));
    }
  }

  const totalConImpuestos = infoNotaCredito.ele('totalConImpuestos');
  for (const impuestoInput of input.totalConImpuestos) {
    const totalImpuesto = totalConImpuestos.ele('totalImpuesto');
    totalImpuesto.ele('codigo').txt(impuestoInput.codigo);
    totalImpuesto.ele('codigoPorcentaje').txt(impuestoInput.codigoPorcentaje);
    totalImpuesto.ele('baseImponible').txt(impuestoInput.baseImponible);
    totalImpuesto.ele('valor').txt(impuestoInput.valor);
  }

  const detalles = notaCredito.ele('detalles');
  for (const detalleInput of input.detalles) {
    const detalle = detalles.ele('detalle');
    if (detalleInput.codigoInterno) {
      detalle.ele('codigoInterno').txt(detalleInput.codigoInterno);
    }
    if (detalleInput.codigoAdicional) {
      detalle.ele('codigoAdicional').txt(detalleInput.codigoAdicional);
    }
    detalle.ele('descripcion').txt(detalleInput.descripcion);
    detalle.ele('cantidad').txt(detalleInput.cantidad);
    detalle.ele('precioUnitario').txt(detalleInput.precioUnitario);
    detalle.ele('descuento').txt(detalleInput.descuento);
    detalle.ele('precioTotalSinImpuesto').txt(detalleInput.precioTotalSinImpuesto);

    const impuestos = detalle.ele('impuestos');
    for (const impuestoInput of detalleInput.impuestos) {
      const impuesto = impuestos.ele('impuesto');
      impuesto.ele('codigo').txt(impuestoInput.codigo);
      impuesto.ele('codigoPorcentaje').txt(impuestoInput.codigoPorcentaje);
      if (impuestoInput.tarifa) {
        impuesto.ele('tarifa').txt(impuestoInput.tarifa);
      }
      impuesto.ele('baseImponible').txt(impuestoInput.baseImponible);
      impuesto.ele('valor').txt(impuestoInput.valor);
    }
  }

  if (input.infoAdicional?.length) {
    const infoAdicional = notaCredito.ele('infoAdicional');
    for (const adicional of input.infoAdicional) {
      infoAdicional.ele('campoAdicional', { nombre: adicional.nombre }).txt(adicional.valor);
    }
  }

  return doc.end({ prettyPrint: true });
}
