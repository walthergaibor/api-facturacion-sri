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
  codigoPrincipal: string;
  codigoAuxiliar?: string;
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

type FacturaXmlInput = {
  infoTributaria: KeyValue;
  infoFactura: KeyValue;
  totalConImpuestos: Impuesto[];
  detalles: Detalle[];
  infoAdicional?: Adicional[];
};

function appendObjectNode(parent: any, nodeName: string, data: KeyValue): void {
  const node = parent.ele(nodeName);
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      node.ele(key).txt(String(value));
    }
  }
}

export function generateFacturaXml(input: FacturaXmlInput): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' });
  const factura = doc.ele('factura', { id: 'comprobante', version: '2.1.0' });

  appendObjectNode(factura, 'infoTributaria', input.infoTributaria);

  const infoFactura = factura.ele('infoFactura');
  const deferredInfoFacturaKeys = new Set(['propina', 'importeTotal', 'moneda']);

  for (const [key, value] of Object.entries(input.infoFactura)) {
    if (deferredInfoFacturaKeys.has(key)) {
      continue;
    }
    if (value !== undefined && value !== null) {
      infoFactura.ele(key).txt(String(value));
    }
  }

  const totalConImpuestos = infoFactura.ele('totalConImpuestos');
  for (const impuesto of input.totalConImpuestos) {
    const totalImpuesto = totalConImpuestos.ele('totalImpuesto');
    totalImpuesto.ele('codigo').txt(impuesto.codigo);
    totalImpuesto.ele('codigoPorcentaje').txt(impuesto.codigoPorcentaje);
    totalImpuesto.ele('baseImponible').txt(impuesto.baseImponible);
    totalImpuesto.ele('valor').txt(impuesto.valor);
  }

  const trailingInfoFacturaKeys: Array<'propina' | 'importeTotal' | 'moneda'> = [
    'propina',
    'importeTotal',
    'moneda'
  ];
  for (const key of trailingInfoFacturaKeys) {
    const value = input.infoFactura[key];
    if (value !== undefined && value !== null) {
      infoFactura.ele(key).txt(String(value));
    }
  }

  const detalles = factura.ele('detalles');
  for (const detalleInput of input.detalles) {
    const detalle = detalles.ele('detalle');
    detalle.ele('codigoPrincipal').txt(detalleInput.codigoPrincipal);
    if (detalleInput.codigoAuxiliar) {
      detalle.ele('codigoAuxiliar').txt(detalleInput.codigoAuxiliar);
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
    const infoAdicional = factura.ele('infoAdicional');
    for (const adicional of input.infoAdicional) {
      infoAdicional.ele('campoAdicional', { nombre: adicional.nombre }).txt(adicional.valor);
    }
  }

  return doc.end({ prettyPrint: true });
}
