"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Boxes, LayoutDashboard, Package, Tags, Warehouse, ArrowLeftRight, Layers,
  Users, FileText, Truck, ShoppingCart, Building2, Building, ShieldCheck, ScrollText, LogOut, Menu, X,
  Wallet, HandCoins, Banknote, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Modulo } from "@/lib/permisos";
import { ThemeToggle } from "@/components/theme-toggle";

type Item = { href: string; label: string; icon: React.ElementType };
type Grupo = { titulo: string; modulo: Modulo | null; items: Item[] };

const NAV: Grupo[] = [
  { titulo: "", modulo: null, items: [{ href: "/tablero", label: "Tablero", icon: LayoutDashboard }] },
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
    titulo: "Finanzas",
    modulo: "finanzas",
    items: [
      { href: "/finanzas/caja", label: "Caja y bancos", icon: Wallet },
      { href: "/finanzas/cobranzas", label: "Cobranzas", icon: HandCoins },
      { href: "/finanzas/pagos", label: "Pagos", icon: Banknote },
    ],
  },
  {
    titulo: "Configuración",
    modulo: "configuracion",
    items: [
      { href: "/configuracion/empresa", label: "Empresa y timbrado", icon: Building2 },
      { href: "/configuracion/usuarios", label: "Usuarios y roles", icon: ShieldCheck },
      { href: "/configuracion/auditoria", label: "Auditoría", icon: ScrollText },
    ],
  },
];

// Grupo visible solo para administradores de plataforma (super-admins).
const PLATAFORMA: Grupo = {
  titulo: "Plataforma",
  modulo: null,
  items: [{ href: "/plataforma/empresas", label: "Empresas", icon: Building }],
};

export function Sidebar({
  usuario,
  permisos,
  esSuperAdmin = false,
  logout,
  colapsado = false,
  onToggleColapsar,
}: {
  usuario: { nombre: string; rol: string };
  permisos: string[];
  esSuperAdmin?: boolean;
  logout: () => Promise<void>;
  colapsado?: boolean;
  onToggleColapsar?: () => void;
}) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const activo = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const grupos = [
    ...NAV.filter((g) => !g.modulo || permisos.includes(g.modulo)),
    ...(esSuperAdmin ? [PLATAFORMA] : []),
  ];

  const nav = (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {grupos.map((g) => (
        <div key={g.titulo || "inicio"}>
          {g.titulo && (
            <div
              className={cn(
                "mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted",
                colapsado && "lg:hidden",
              )}
            >
              {g.titulo}
            </div>
          )}
          <ul className="grid gap-0.5">
            {g.items.map((it) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  onClick={() => setAbierto(false)}
                  title={colapsado ? it.label : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                    colapsado && "lg:justify-center lg:gap-0 lg:px-0",
                    activo(it.href)
                      ? "bg-sidebar-accent font-medium text-white"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
                  )}
                >
                  <it.icon className="size-4 shrink-0" />
                  <span className={cn(colapsado && "lg:hidden")}>{it.label}</span>
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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 lg:translate-x-0",
          colapsado ? "lg:w-20" : "lg:w-64",
          abierto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center gap-2.5 border-b border-white/10 px-5",
            colapsado && "lg:gap-0 lg:px-3",
          )}
        >
          <div className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <Boxes className="size-4" />
          </div>
          <span className={cn("font-semibold text-white", colapsado && "lg:hidden")}>ERP</span>

          {/* Colapsar (solo escritorio) */}
          <button
            onClick={onToggleColapsar}
            aria-label={colapsado ? "Expandir menú" : "Colapsar menú"}
            title={colapsado ? "Expandir menú" : "Colapsar menú"}
            className="ml-auto hidden text-sidebar-foreground/70 hover:text-white lg:inline-flex"
          >
            {colapsado ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>

          {/* Cerrar (solo móvil) */}
          <button className="ml-auto lg:hidden" onClick={() => setAbierto(false)} aria-label="Cerrar menú">
            <X className="size-5" />
          </button>
        </div>
        {nav}
        <div className={cn("border-t border-white/10 p-3", colapsado && "lg:px-2")}>
          <div className={cn("px-2 pb-2", colapsado && "lg:hidden")}>
            <div className="truncate text-sm font-medium text-white">{usuario.nombre}</div>
            <div className="text-xs text-sidebar-muted">{usuario.rol}</div>
          </div>
          <div
            className={cn(
              "flex items-center justify-between px-2 pb-2",
              colapsado && "lg:justify-center lg:px-0",
            )}
          >
            <span className={cn("text-sm text-sidebar-foreground/80", colapsado && "lg:hidden")}>
              Tema oscuro
            </span>
            <ThemeToggle />
          </div>
          <form action={logout}>
            <button
              title={colapsado ? "Cerrar sesión" : undefined}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
                colapsado && "lg:justify-center lg:gap-0 lg:px-0",
              )}
            >
              <LogOut className="size-4 shrink-0" />
              <span className={cn(colapsado && "lg:hidden")}>Cerrar sesión</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
