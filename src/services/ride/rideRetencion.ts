import { PassThrough } from 'node:stream';

type PdfDocLike = {
  fontSize: (size: number) => PdfDocLike;
  text: (text: string) => PdfDocLike;
  moveDown: (lines?: number) => PdfDocLike;
  pipe: (stream: NodeJS.WritableStream) => NodeJS.WritableStream;
  end: () => void;
};

type RideRetencionInput = {
  claveAcceso: string;
  emisor: { razonSocial: string; ruc: string };
  sujetoRetenido: { razonSocial: string; identificacion: string };
  retenciones: Array<{ codigo: string; codigoRetencion: string; baseImponible: string; valorRetenido: string }>;
  periodoFiscal: string;
};

type RideRetencionDeps = {
  createPdfDoc: () => Promise<PdfDocLike>;
};

async function createDefaultPdfDoc(): Promise<PdfDocLike> {
  const moduleLike = (await import('pdfkit')) as any;
  const PDFDocument = moduleLike.default ?? moduleLike;
  return new PDFDocument({ size: 'A4', margin: 40 });
}

function buildHeader(doc: PdfDocLike, input: RideRetencionInput): void {
  doc.fontSize(16).text('RIDE RETENCION');
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Clave de acceso: ${input.claveAcceso}`);
  doc.text(`Emisor: ${input.emisor.razonSocial} - RUC ${input.emisor.ruc}`);
  doc.text(`Sujeto retenido: ${input.sujetoRetenido.razonSocial} - ${input.sujetoRetenido.identificacion}`);
  doc.text(`Periodo fiscal: ${input.periodoFiscal}`);
}

function buildRetenciones(doc: PdfDocLike, input: RideRetencionInput): void {
  doc.moveDown().fontSize(12).text('Detalle de retenciones');
  for (const row of input.retenciones) {
    doc
      .fontSize(10)
      .text(
        `Cod: ${row.codigo}/${row.codigoRetencion} | Base: ${row.baseImponible} | Valor retenido: ${row.valorRetenido}`
      );
  }
}

export function createRideRetencionService(customDeps: Partial<RideRetencionDeps> = {}) {
  const deps: RideRetencionDeps = {
    createPdfDoc: customDeps.createPdfDoc ?? createDefaultPdfDoc
  };

  return {
    async generateRideRetencionPdf(input: RideRetencionInput): Promise<Buffer> {
      const doc = await deps.createPdfDoc();
      const stream = new PassThrough();
      const chunks: Buffer[] = [];

      return new Promise<Buffer>((resolve, reject) => {
        stream.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);

        doc.pipe(stream);
        buildHeader(doc, input);
        buildRetenciones(doc, input);
        doc.end();
      });
    }
  };
}
