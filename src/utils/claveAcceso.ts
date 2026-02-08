type GenerarClaveAccesoInput = {
  fechaEmision: string;
  tipoDocumento: string;
  ruc: string;
  ambiente: string;
  serie: string;
  secuencial: string;
  codigoNumerico: string;
  tipoEmision: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function fechaToDDMMAAAA(fecha: string): string {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) {
    throw new Error('fechaEmision invalida');
  }
  return `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${d.getFullYear()}`;
}

function assertNumeric(name: string, value: string, expectedLength: number): void {
  if (!/^\d+$/.test(value) || value.length !== expectedLength) {
    throw new Error(`${name} debe tener ${expectedLength} digitos numericos`);
  }
}

export function calcularDigitoVerificadorModulo11(base48: string): number {
  if (!/^\d{48}$/.test(base48)) {
    throw new Error('base48 debe tener 48 digitos numericos');
  }

  let factor = 2;
  let suma = 0;

  for (let i = base48.length - 1; i >= 0; i -= 1) {
    suma += Number(base48[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const modulo = suma % 11;
  const dv = 11 - modulo;

  if (dv === 11) return 0;
  if (dv === 10) return 1;
  return dv;
}

export function generarClaveAcceso(input: GenerarClaveAccesoInput): string {
  const fecha = fechaToDDMMAAAA(input.fechaEmision);
  assertNumeric('tipoDocumento', input.tipoDocumento, 2);
  assertNumeric('ruc', input.ruc, 13);
  assertNumeric('ambiente', input.ambiente, 1);
  assertNumeric('serie', input.serie, 6);
  assertNumeric('secuencial', input.secuencial, 9);
  assertNumeric('codigoNumerico', input.codigoNumerico, 8);
  assertNumeric('tipoEmision', input.tipoEmision, 1);

  const base48 =
    fecha +
    input.tipoDocumento +
    input.ruc +
    input.ambiente +
    input.serie +
    input.secuencial +
    input.codigoNumerico +
    input.tipoEmision;

  const dv = calcularDigitoVerificadorModulo11(base48);
  return `${base48}${dv}`;
}
