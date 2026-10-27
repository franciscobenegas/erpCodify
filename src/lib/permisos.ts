export const MODULOS = [
  { key: "inventario", label: "Inventario" },
  { key: "ventas", label: "Ventas" },
  { key: "compras", label: "Compras" },
  { key: "configuracion", label: "Configuración" },
] as const;

export type Modulo = (typeof MODULOS)[number]["key"];

// Prefijo de ruta → módulo requerido
export const RUTAS_MODULO: [string, Modulo][] = [
  ["/inventario", "inventario"],
  ["/ventas", "ventas"],
  ["/compras", "compras"],
  ["/configuracion", "configuracion"],
];

export function moduloDeRuta(pathname: string): Modulo | null {
  return RUTAS_MODULO.find(([p]) => pathname === p || pathname.startsWith(p + "/"))?.[1] ?? null;
}
