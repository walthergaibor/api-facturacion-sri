import test from 'node:test';
import assert from 'node:assert/strict';

test('xmlGeneratorFactura generates expected SRI sections', async () => {
  const { generateFacturaXml } = await import('../../../dist/services/sri/xmlGeneratorFactura.js');

  const xml = generateFacturaXml({
    infoTributaria: {
      ambiente: '1',
      tipoEmision: '1',
      razonSocial: 'Empresa Demo',
      nombreComercial: 'Empresa Demo',
      ruc: '1710034065001',
      claveAcceso: '1234567890123456789012345678901234567890123456789',
      codDoc: '01',
      estab: '001',
      ptoEmi: '001',
      secuencial: '000000001',
      dirMatriz: 'Quito'
    },
    infoFactura: {
      fechaEmision: '08/02/2026',
      dirEstablecimiento: 'Quito',
      obligadoContabilidad: 'NO',
      tipoIdentificacionComprador: '05',
      razonSocialComprador: 'Cliente Demo',
      identificacionComprador: '1710034065',
      totalSinImpuestos: '10.00',
      totalDescuento: '0.00',
      propina: '0.00',
      importeTotal: '11.20',
      moneda: 'DOLAR'
    },
    totalConImpuestos: [
      { codigo: '2', codigoPorcentaje: '2', baseImponible: '10.00', valor: '1.20' }
    ],
    detalles: [
      {
        codigoPrincipal: 'P001',
        descripcion: 'Producto 1',
        cantidad: '1',
        precioUnitario: '10.00',
        descuento: '0.00',
        precioTotalSinImpuesto: '10.00',
        impuestos: [{ codigo: '2', codigoPorcentaje: '2', tarifa: '12', baseImponible: '10.00', valor: '1.20' }]
      }
    ],
    infoAdicional: [{ nombre: 'Email', valor: 'cliente@demo.com' }]
  });

  assert.match(xml, /<factura/);
  assert.match(xml, /<infoTributaria>/);
  assert.match(xml, /<infoFactura>/);
  assert.match(xml, /<detalles>/);
  assert.match(xml, /<infoAdicional>/);
});

test('xmlGeneratorNotaCredito generates expected SRI sections', async () => {
  const { generateNotaCreditoXml } = await import('../../../dist/services/sri/xmlGeneratorNotaCredito.js');

  const xml = generateNotaCreditoXml({
    infoTributaria: {
      ambiente: '1',
      tipoEmision: '1',
      razonSocial: 'Empresa Demo',
      nombreComercial: 'Empresa Demo',
      ruc: '1710034065001',
      claveAcceso: '9876543210987654321098765432109876543210987654321',
      codDoc: '04',
      estab: '001',
      ptoEmi: '001',
      secuencial: '000000001',
      dirMatriz: 'Quito'
    },
    infoNotaCredito: {
      fechaEmision: '08/02/2026',
      dirEstablecimiento: 'Quito',
      tipoIdentificacionComprador: '05',
      razonSocialComprador: 'Cliente Demo',
      identificacionComprador: '1710034065',
      contribuyenteEspecial: '',
      obligadoContabilidad: 'NO',
      codDocModificado: '01',
      numDocModificado: '001-001-000000001',
      fechaEmisionDocSustento: '08/02/2026',
      totalSinImpuestos: '10.00',
      valorModificacion: '11.20',
      moneda: 'DOLAR'
    },
    totalConImpuestos: [
      { codigo: '2', codigoPorcentaje: '2', baseImponible: '10.00', valor: '1.20' }
    ],
    detalles: [
      {
        codigoInterno: 'P001',
        descripcion: 'Producto 1',
        cantidad: '1',
        precioUnitario: '10.00',
        descuento: '0.00',
        precioTotalSinImpuesto: '10.00',
        impuestos: [{ codigo: '2', codigoPorcentaje: '2', tarifa: '12', baseImponible: '10.00', valor: '1.20' }]
      }
    ],
    infoAdicional: [{ nombre: 'Motivo', valor: 'Devolucion parcial' }]
  });

  assert.match(xml, /<notaCredito/);
  assert.match(xml, /<infoTributaria>/);
  assert.match(xml, /<infoNotaCredito>/);
  assert.match(xml, /<detalles>/);
  assert.match(xml, /<infoAdicional>/);
});
