import test from 'node:test';
import assert from 'node:assert/strict';

test('xmlGeneratorRetencion generates required sections', async () => {
  const { generateRetencionXml } = await import('../../../dist/services/sri/xmlGeneratorRetencion.js');

  const xml = generateRetencionXml({
    infoTributaria: {
      ambiente: '1',
      tipoEmision: '1',
      razonSocial: 'Empresa Demo',
      nombreComercial: 'Empresa Demo',
      ruc: '1710034065001',
      claveAcceso: '1234567890123456789012345678901234567890123456789',
      codDoc: '07',
      estab: '001',
      ptoEmi: '001',
      secuencial: '000000001',
      dirMatriz: 'Quito'
    },
    infoCompRetencion: {
      fechaEmision: '08/02/2026',
      dirEstablecimiento: 'Quito',
      obligadoContabilidad: 'NO',
      tipoIdentificacionSujetoRetenido: '05',
      razonSocialSujetoRetenido: 'Proveedor Demo',
      identificacionSujetoRetenido: '1710034065',
      periodoFiscal: '02/2026'
    },
    docsSustento: [
      {
        codSustento: '01',
        codDocSustento: '01',
        numDocSustento: '001001000000123',
        fechaEmisionDocSustento: '08/02/2026',
        pagos: [],
        impuestosDocSustento: [],
        retenciones: [
          {
            codigo: '1',
            codigoRetencion: '312',
            baseImponible: '100.00',
            porcentajeRetener: '1.00',
            valorRetenido: '1.00'
          }
        ]
      }
    ],
    infoAdicional: [{ nombre: 'Email', valor: 'proveedor@demo.com' }]
  });

  assert.match(xml, /<comprobanteRetencion/);
  assert.match(xml, /<infoTributaria>/);
  assert.match(xml, /<infoCompRetencion>/);
  assert.match(xml, /<docsSustento>/);
  assert.match(xml, /<retenciones>/);
  assert.match(xml, /<infoAdicional>/);
});
