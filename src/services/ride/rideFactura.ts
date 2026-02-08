import { PassThrough } from 'node:stream';

type PdfDocLike = {
  fontSize: (size: number) => PdfDocLike;
  text: (text: string) => PdfDocLike;
  moveDown: (lines?: number) => PdfDocLike;
  pipe: (stream: NodeJS.WritableStream) => NodeJS.WritableStream;
  end: () => void;
};

type RideFacturaInput = {
  claveAcceso: string;
  emisor: { razonSocial: string; ruc: string };
  comprador: { razonSocial: string; identificacion: string };
  items: Array<{ descripcion: string; cantidad: string; precioUnitario: string; total: string }>;
  totales: { subtotal: string; impuestos: string; total: string };
};

type RideFacturaDeps = {
  createPdfDoc: () => Promise<PdfDocLike>;
};

async function createDefaultPdfDoc(): Promise<PdfDocLike> {
  const moduleLike = (await import('pdfkit')) as any;
  const PDFDocument = moduleLike.default ?? moduleLike;
  return new PDFDocument({ size: 'A4', margin: 40 });
}

function buildHeader(doc: PdfDocLike, input: RideFacturaInput): void {
  doc.fontSize(16).text('RIDE FACTURA');
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Clave de acceso: ${input.claveAcceso}`);
  doc.text(`Emisor: ${input.emisor.razonSocial} - RUC ${input.emisor.ruc}`);
  doc.text(`Comprador: ${input.comprador.razonSocial} - ${input.comprador.identificacion}`);
}

function buildItems(doc: PdfDocLike, input: RideFacturaInput): void {
  doc.moveDown().fontSize(12).text('Detalle');
  for (const item of input.items) {
    doc
      .fontSize(10)
      .text(`${item.descripcion} | Cant: ${item.cantidad} | P.Unit: ${item.precioUnitario} | Total: ${item.total}`);
  }
}

function buildTotals(doc: PdfDocLike, input: RideFacturaInput): void {
  doc.moveDown().fontSize(12).text('Totales');
  doc.fontSize(10).text(`Subtotal: ${input.totales.subtotal}`);
  doc.text(`Impuestos: ${input.totales.impuestos}`);
  doc.text(`Total: ${input.totales.total}`);
}

export function createRideFacturaService(customDeps: Partial<RideFacturaDeps> = {}) {
  const deps: RideFacturaDeps = {
    createPdfDoc: customDeps.createPdfDoc ?? createDefaultPdfDoc
  };

  return {
    async generateRideFacturaPdf(input: RideFacturaInput): Promise<Buffer> {
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
        buildItems(doc, input);
        buildTotals(doc, input);
        doc.end();
      });
    }
  };
}
