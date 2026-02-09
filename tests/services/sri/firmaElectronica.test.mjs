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

test('firmaElectronica trims decrypted password before signing', async () => {
  const { createFirmaElectronicaService } = await import('../../../dist/services/sri/firmaElectronica.js');

  let receivedPassword = '';

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
      download: async () => Buffer.from('p12-binary')
    },
    decryptPassword: () => 'secret   ',
    signers: {
      signInvoiceXml: async (_xml, _p12, password) => {
        receivedPassword = password;
        return 'signed';
      },
      signCreditNoteXml: async () => 'signed',
      signWithholdingCertificateXml: async () => 'signed'
    },
    now: () => 0
  });

  const signed = await service.signXmlForEmpresa({
    empresaId: 'empresa-1',
    tipoDocumento: '01',
    xml: '<xml />'
  });

  assert.equal(signed, 'signed');
  assert.equal(receivedPassword, 'secret');
});

test('firmaElectronica retries signing after normalizing legacy PKCS#12', async () => {
  const { createFirmaElectronicaService } = await import('../../../dist/services/sri/firmaElectronica.js');

  let normalizeCalled = false;
  let signAttempts = 0;

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
      download: async () => Buffer.from('legacy-p12')
    },
    decryptPassword: () => 'secret',
    normalizeLegacyPkcs12: async () => {
      normalizeCalled = true;
      return Buffer.from('normalized-p12');
    },
    signers: {
      signInvoiceXml: async (_xml, p12) => {
        signAttempts += 1;
        if (p12.toString() === 'legacy-p12') {
          throw new Error('PKCS#12 MAC could not be verified. Invalid password?');
        }
        return 'signed-after-normalize';
      },
      signCreditNoteXml: async () => 'signed',
      signWithholdingCertificateXml: async () => 'signed'
    },
    now: () => 0
  });

  const signed = await service.signXmlForEmpresa({
    empresaId: 'empresa-1',
    tipoDocumento: '01',
    xml: '<xml />'
  });

  assert.equal(signed, 'signed-after-normalize');
  assert.equal(normalizeCalled, true);
  assert.equal(signAttempts, 2);
});
