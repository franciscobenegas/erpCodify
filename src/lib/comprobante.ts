import type { TipoComprobante } from "@prisma/client";

// Tipos de comprobante soportados en ventas, en orden de uso. Cada uno lleva su
// propio timbrado y numeración (ver modelo TimbradoComprobante).
export const TIPOS_COMPROBANTE: { tipo: TipoComprobante; label: string }[] = [
  { tipo: "FACTURA", label: "Factura" },
  { tipo: "BOLETA", label: "Boleta de Venta" },
  { tipo: "PEQUENO_CONTRIBUYENTE", label: "Factura de Pequeño Contribuyente" },
  { tipo: "AUTOFACTURA", label: "Auto-Factura" },
];

export const nombreComprobante = (t: TipoComprobante) =>
  TIPOS_COMPROBANTE.find((x) => x.tipo === t)?.label ?? t;
