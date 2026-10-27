// Convierte un entero a letras en español (para "Total en guaraníes: ...").
const U = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez",
  "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte",
  "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const D = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const C = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function menorMil(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const c = Math.floor(n / 100), r = n % 100;
  let s = C[c];
  if (r) {
    const dec = r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? " y " + U[r % 10] : "");
    s = (s ? s + " " : "") + dec;
  }
  return s;
}

const apocope = (s: string) => s.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");

export function numeroALetras(n: number): string {
  n = Math.round(Math.abs(n));
  if (n === 0) return "cero";
  const partes: string[] = [];
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  if (millones) partes.push(millones === 1 ? "un millón" : apocope(numeroALetras(millones)) + " millones");
  if (miles) partes.push(miles === 1 ? "mil" : apocope(menorMil(miles)) + " mil");
  if (resto) partes.push(menorMil(resto));
  return partes.join(" ");
}
