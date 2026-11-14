import Link from "next/link";
import { Boxes, Check } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  "Inventario y stock por depósito en tiempo real",
  "Facturación con timbrado e IVA incluido",
  "Órdenes de compra y gestión de proveedores",
];

/**
 * Marco de pantalla dividida para las páginas de autenticación (login / registro).
 * Panel de marca a la izquierda (oculto en móvil) y contenido del formulario a la derecha.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Panel de marca */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
        />
        <Link href="/" className="relative flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="size-5" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight">ERP</p>
            <p className="text-sm text-sidebar-muted">Inventario · Ventas · Compras</p>
          </div>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-2xl font-semibold leading-snug">
            Controlá tu negocio de punta a punta.
          </h2>
          <ul className="mt-6 grid gap-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-sidebar-foreground/90">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
                  <Check className="size-3" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sidebar-muted">
          © {new Date().getFullYear()} ERP · Todos los derechos reservados
        </p>
      </aside>

      {/* Formulario */}
      <div className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle variant="surface" />
        </div>
        <div className="w-full max-w-sm">
          {/* Marca compacta solo en móvil */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="size-5" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-tight">ERP</p>
              <p className="text-sm text-muted-foreground">Inventario · Ventas · Compras</p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}

          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </main>
  );
}
