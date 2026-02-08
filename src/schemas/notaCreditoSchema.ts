import { z } from 'zod';

const impuestoSchema = z.object({
  codigo: z.string().min(1),
  codigoPorcentaje: z.string().min(1),
  tarifa: z.number().nonnegative()
});

const itemSchema = z.object({
  codigoInterno: z.string().optional(),
  codigoAdicional: z.string().optional(),
  descripcion: z.string().min(1),
  cantidad: z.number().positive(),
  precioUnitario: z.number().nonnegative(),
  descuento: z.number().nonnegative(),
  impuestos: z.array(impuestoSchema).min(1)
});

export const notaCreditoSchema = z.object({
  fechaEmision: z.string().min(1),
  motivo: z.string().min(1),
  docModificado: z.object({
    codDocModificado: z.string().length(2),
    numDocModificado: z.string().min(10),
    fechaEmisionDocSustento: z.string().min(1)
  }),
  comprador: z.object({
    tipoIdentificacion: z.string().min(2),
    identificacion: z.string().min(5),
    razonSocial: z.string().min(1)
  }),
  items: z.array(itemSchema).min(1),
  infoAdicional: z
    .array(
      z.object({
        nombre: z.string().min(1),
        valor: z.string().min(1)
      })
    )
    .optional()
});

export type NotaCreditoInput = z.infer<typeof notaCreditoSchema>;
