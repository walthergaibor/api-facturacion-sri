import test from 'node:test';
import assert from 'node:assert/strict';

test('emailService sends email with PDF and XML attachments', async () => {
  const { createEmailService } = await import('../../../dist/services/email/emailService.js');

  let payloadSeen = null;
  const service = createEmailService({
    resendClient: {
      emails: {
        send: async (payload) => {
          payloadSeen = payload;
          return { data: { id: 'mail_1' }, error: null };
        }
      }
    },
    from: 'facturacion@example.com'
  });

  const result = await service.sendComprobanteEmail({
    to: 'cliente@example.com',
    subject: 'Comprobante',
    text: 'Adjunto comprobante',
    pdfBuffer: Buffer.from('pdf'),
    xmlContent: '<xml />',
    claveAcceso: 'ABC123'
  });

  assert.equal(result.id, 'mail_1');
  assert.equal(payloadSeen.to, 'cliente@example.com');
  assert.equal(payloadSeen.attachments.length, 2);
});
