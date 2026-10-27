"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Boxes, LayoutDashboard, Package, Tags, Warehouse, ArrowLeftRight, Layers,
  Users, FileText, Truck, ShoppingCart, Building2, ShieldCheck, LogOut, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Modulo } from "@/lib/permisos";

type Item = { href: string; label: string; icon: React.ElementType };
type Grupo = { titulo: string; modulo: Modulo | null; items: Item[] };

const NAV: Grupo[] = [
  { titulo: "", modulo: null, items: [{ href: "/", label: "Tablero", icon: LayoutDashboard }] },
  {
    titulo: "Inventario",
    modulo: "inventario",
    items: [
      { href: "/inventario/productos", label: "Productos", icon: Package },
      { href: "/inventario/stock", label: "Stock", icon: Layers },
      { href: "/inventario/movimientos", label: "Movimientos", icon: ArrowLeftRight },
      { href: "/inventario/categorias", label: "Categorías", icon: Tags },
      { href: "/inventario/depositos", label: "Depósitos", icon: Warehouse },
    ],
  },
  {
    titulo: "Ventas",
    modulo: "ventas",
    items: [
      { href: "/ventas/facturas", label: "Facturas", icon: FileText },
      { href: "/ventas/clientes", label: "Clientes", icon: Users },
    ],
  },
  {
    titulo: "Compras",
    modulo: "compras",
    items: [
      { href: "/compras/ordenes", label: "Órdenes de compra", icon: ShoppingCart },
      { href: "/compras/proveedores", label: "Proveedores", icon: Truck },
    ],
  },
  {
    titulo: "Configuración",
    modulo: "configuracion",
    items: [
      { href: "/configuracion/empresa", label: "Empresa y timbrado", icon: Building2 },
      { href: "/configuracion/usuarios", label: "Usuarios y roles", icon: ShieldCheck },
    ],
  },
];

export function Sidebar({
  usuario,
  permisos,
  logout,
}: {
  usuario: { nombre: string; rol: string };
  permisos: string[];
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const activo = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));

  const nav = (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {NAV.filter((g) => !g.modulo || permisos.includes(g.modulo)).map((g) => (
        <div key={g.titulo || "inicio"}>
          {g.titulo && (
            <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
              {g.titulo}
            </div>
          )}
          <ul className="grid gap-0.5">
            {g.items.map((it) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  onClick={() => setAbierto(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                    activo(it.href)
                      ? "bg-sidebar-accent font-medium text-white"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
                  )}
                >
                  <it.icon className="size-4 shrink-0" />
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Barra superior en móvil */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-sidebar px-4 text-sidebar-foreground lg:hidden">
        <button onClick={() => setAbierto(true)} aria-label="Abrir menú">
          <Menu className="size-5" />
        </button>
        <span className="font-semibold">ERP</span>
      </div>

      {abierto && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setAbierto(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0",
          abierto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-5">
          <div className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Boxes className="size-4" />
          </div>
          <span className="font-semibold text-white">ERP</span>
          <button className="ml-auto lg:hidden" onClick={() => setAbierto(false)} aria-label="Cerrar menú">
            <X className="size-5" />
          </button>
        </div>
        {nav}
        <div className="border-t border-white/10 p-3">
          <div className="px-2 pb-2">
            <div className="truncate text-sm font-medium text-white">{usuario.nombre}</div>
            <div className="text-xs text-sidebar-muted">{usuario.rol}</div>
          </div>
          <form action={logout}>
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white">
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
