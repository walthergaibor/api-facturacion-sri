import { Resend } from 'resend';

type SendComprobanteEmailInput = {
  to: string;
  subject: string;
  text: string;
  pdfBuffer: Buffer;
  xmlContent: string;
  claveAcceso: string;
};

type EmailServiceDeps = {
  resendClient: {
    emails: {
      send: (payload: Record<string, unknown>) => Promise<{ data?: { id?: string }; error?: { message?: string } | null }>;
    };
  };
  from: string;
};

function defaultResendClient() {
  const apiKey = process.env.RESEND_API_KEY ?? '';
  return new Resend(apiKey);
}

export function createEmailService(customDeps: Partial<EmailServiceDeps> = {}) {
  const deps: EmailServiceDeps = {
    resendClient: customDeps.resendClient ?? (defaultResendClient() as any),
    from: customDeps.from ?? process.env.RESEND_FROM_EMAIL ?? 'facturacion@example.com'
  };

  return {
    async sendComprobanteEmail(input: SendComprobanteEmailInput): Promise<{ id: string }> {
      const { data, error } = await deps.resendClient.emails.send({
        from: deps.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        attachments: [
          {
            filename: `RIDE-${input.claveAcceso}.pdf`,
            content: input.pdfBuffer
          },
          {
            filename: `AUTORIZADO-${input.claveAcceso}.xml`,
            content: Buffer.from(input.xmlContent, 'utf8')
          }
        ]
      });

      if (error) {
        throw new Error(`No se pudo enviar email: ${error.message ?? 'error desconocido'}`);
      }

      return { id: data?.id ?? 'unknown' };
    }
  };
}

let defaultService: ReturnType<typeof createEmailService> | null = null;

export function getEmailService() {
  if (!defaultService) {
    defaultService = createEmailService();
  }
  return defaultService;
}
