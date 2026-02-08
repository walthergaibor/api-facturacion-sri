export function calcularModulo10(base: string): number {
  if (!/^\d+$/.test(base)) {
    throw new Error('base must be numeric');
  }

  let suma = 0;
  let multiplicarPorDos = true;

  for (let i = base.length - 1; i >= 0; i -= 1) {
    let valor = Number(base[i]);
    if (multiplicarPorDos) {
      valor *= 2;
      if (valor > 9) {
        valor -= 9;
      }
    }
    suma += valor;
    multiplicarPorDos = !multiplicarPorDos;
  }

  const resto = suma % 10;
  return resto === 0 ? 0 : 10 - resto;
}

export function calcularModulo11(base: string): number {
  if (!/^\d+$/.test(base)) {
    throw new Error('base must be numeric');
  }

  let factor = 2;
  let suma = 0;

  for (let i = base.length - 1; i >= 0; i -= 1) {
    suma += Number(base[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const modulo = suma % 11;
  const digito = 11 - modulo;
  if (digito === 11) return 0;
  if (digito === 10) return 1;
  return digito;
}

export function validarCedula(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) {
    return false;
  }

  const provincia = Number(cedula.slice(0, 2));
  const tercerDigito = Number(cedula[2]);

  if (provincia < 1 || provincia > 24 || tercerDigito >= 6) {
    return false;
  }

  const base = cedula.slice(0, 9);
  const digito = Number(cedula[9]);
  return calcularModulo10(base) === digito;
}

export function validarRuc(ruc: string): boolean {
  if (!/^\d{13}$/.test(ruc)) {
    return false;
  }

  if (ruc.endsWith('000')) {
    return false;
  }

  const tipo = Number(ruc[2]);
  if (tipo <= 5) {
    return validarCedula(ruc.slice(0, 10)) && ruc.slice(10) === '001';
  }

  if (tipo === 6) {
    const base = ruc.slice(0, 8);
    const digito = Number(ruc[8]);
    return calcularModulo11(base) === digito;
  }

  if (tipo === 9) {
    const base = ruc.slice(0, 9);
    const digito = Number(ruc[9]);
    return calcularModulo11(base) === digito;
  }

  return false;
}
