import test from 'node:test';
import assert from 'node:assert/strict';

test('firmaElectronica throws clear error when no active signature exists', async () => {
  const { createFirmaElectronicaService } = await import('../../../dist/services/sri/firmaElectronica.js');

  const service = createFirmaElectronicaService({
    db: {
      firmaElectronica: {
        findFirst: async () => null
      }
    },
    storage: {
      download: async () => Buffer.from('')
    },
    decryptPassword: () => 'secret',
    signers: {
      signInvoiceXml: async () => 'signed',
      signCreditNoteXml: async () => 'signed',
      signWithholdingCertificateXml: async () => 'signed'
    },
    now: () => Date.now()
  });

  await assert.rejects(
    () => service.signXmlForEmpresa({ empresaId: 'empresa-1', tipoDocumento: '01', xml: '<xml />' }),
    /La empresa no tiene firma electronica activa/
  );
});

test('firmaElectronica caches downloaded certificate for 5 minutes', async () => {
  const { createFirmaElectronicaService } = await import('../../../dist/services/sri/firmaElectronica.js');

  let downloadCount = 0;
  let time = 0;

  const service = createFirmaElectronicaService({
    db: {
      firmaElectronica: {
        findFirst: async () => ({
          id: 'firma-1',
          empresaId: 'empresa-1',
          storagePath: 'firmas/empresa-1/firma-1.p12',
          p12PasswordEnc: 'enc',
          p12PasswordIv: 'iv',
          p12PasswordTag: 'tag',
          activa: true
        })
      }
    },
    storage: {
      download: async () => {
        downloadCount += 1;
        return Buffer.from('p12-binary');
      }
    },
    decryptPassword: () => 'secret',
    signers: {
      signInvoiceXml: async () => 'signed-invoice',
      signCreditNoteXml: async () => 'signed-credit',
      signWithholdingCertificateXml: async () => 'signed-ret'
    },
    now: () => time
  });

  const first = await service.signXmlForEmpresa({ empresaId: 'empresa-1', tipoDocumento: '01', xml: '<xml />' });
  time += 60_000;
  const second = await service.signXmlForEmpresa({ empresaId: 'empresa-1', tipoDocumento: '01', xml: '<xml />' });

  assert.equal(first, 'signed-invoice');
  assert.equal(second, 'signed-invoice');
  assert.equal(downloadCount, 1);
});
