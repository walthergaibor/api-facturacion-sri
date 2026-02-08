export const tiposImpuesto = {
  IVA: {
    codigo: '2',
    nombre: 'Impuesto al Valor Agregado',
    tarifas: [0, 5, 12, 15]
  },
  ICE: {
    codigo: '3',
    nombre: 'Impuesto a los Consumos Especiales',
    tarifas: [] as number[]
  },
  IRBPNR: {
    codigo: '5',
    nombre: 'Impuesto Redimible a las Botellas Plasticas No Retornables',
    tarifas: [] as number[]
  }
} as const;
