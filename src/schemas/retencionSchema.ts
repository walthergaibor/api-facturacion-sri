import { z } from 'zod';

const retencionItemSchema = z.object({
  codigo: z.string().min(1),
  codigoRetencion: z.string().min(1),
  baseImponible: z.number().nonnegative(),
  porcentajeRetener: z.number().nonnegative(),
  valorRetenido: z.number().nonnegative()
});

export const retencionSchema = z.object({
  fechaEmision: z.string().min(1),
  sujetoRetenido: z.object({
    tipoIdentificacion: z.string().min(2),
    identificacion: z.string().min(5),
    razonSocial: z.string().min(1)
  }),
  docSustento: z.object({
    codDocSustento: z.string().length(2),
    numDocSustento: z.string().min(10),
    fechaEmisionDocSustento: z.string().min(1)
  }),
  retenciones: z.array(retencionItemSchema).min(1),
  infoAdicional: z
    .array(
      z.object({
        nombre: z.string().min(1),
        valor: z.string().min(1)
      })
    )
    .optional()
});

export type RetencionInput = z.infer<typeof retencionSchema>;
