// Cálculo de IVA paraguayo con precios IVA incluido.
// IVA 10% = total / 11 ; IVA 5% = total / 21

export type LineaIva = { subtotal: number; tasaIva: number };

export function calcularTotales(lineas: LineaIva[]) {
  let exenta = 0, gravada5 = 0, gravada10 = 0;
  for (const l of lineas) {
    if (l.tasaIva === 10) gravada10 += l.subtotal;
    else if (l.tasaIva === 5) gravada5 += l.subtotal;
    else exenta += l.subtotal;
  }
  const iva10 = Math.round(gravada10 / 11);
  const iva5 = Math.round(gravada5 / 21);
  return { exenta, gravada5, gravada10, iva5, iva10, total: exenta + gravada5 + gravada10 };
}

export const formatNumeroFactura = (est: string, pto: string, n: number) =>
  `${est}-${pto}-${String(n).padStart(7, "0")}`;
