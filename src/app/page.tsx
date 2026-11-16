import Link from "next/link";
import type { Metadata } from "next";
import {
  Boxes, Package, FileText, ShoppingCart, Wallet, Building2, LayoutDashboard, ShieldCheck,
  Check, ArrowRight, TrendingUp, AlertTriangle, ChevronDown,
  Store, Truck, Wrench, Cross, ShoppingBasket, Briefcase,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: { absolute: "erpCodify — ERP de inventario, ventas y compras" },
  description:
    "ERP simple y completo para PYMEs: stock por depósito en tiempo real, facturación con timbrado, compras, finanzas (caja, cobranzas y pagos), multi-empresa y tablero en vivo.",
};

const funciones = [
  { icon: Package, titulo: "Inventario y stock", texto: "Existencias por depósito en tiempo real, con movimientos, ajustes y transferencias." },
  { icon: FileText, titulo: "Facturación", texto: "Emití facturas con timbrado, IVA incluido y numeración automática. PDF listo para imprimir." },
  { icon: ShoppingCart, titulo: "Compras y proveedores", texto: "Órdenes de compra, recepción de mercadería e ingreso automático al stock." },
  { icon: Wallet, titulo: "Finanzas", texto: "Caja y bancos, cobranzas y pagos: cada cobro y pago impacta en tu saldo al instante." },
  { icon: Building2, titulo: "Multi-empresa", texto: "Gestioná varias empresas con datos totalmente aislados desde una sola cuenta." },
  { icon: ShieldCheck, titulo: "Auditoría", texto: "Bitácora inmutable de cada operación: quién hizo qué y cuándo." },
  { icon: LayoutDashboard, titulo: "Tablero en vivo", texto: "Ventas del mes, valor del inventario, compras por recibir y alertas de stock mínimo." },
];

const beneficios = [
  "Pensado para Paraguay: timbrado SET, IVA 10 % / 5 % / exenta y guaraníes.",
  "Roles y permisos por módulo para cada usuario.",
  "100 % web: sin instalaciones, funciona desde el navegador.",
  "Imágenes de producto, ficha de clientes y proveedores.",
];

const pasos = [
  { n: "1", titulo: "Creá tu empresa", texto: "Registrate en segundos y quedás como administrador, con datos de ejemplo cargados." },
  { n: "2", titulo: "Cargá tu catálogo", texto: "Sumá productos, depósitos, clientes y proveedores (o editá los de ejemplo)." },
  { n: "3", titulo: "Empezá a operar", texto: "Facturá, comprá, cobrá y pagá; seguí tu caja y tus números desde el tablero." },
];

const sectores = [
  { icon: Store, label: "Comercios minoristas" },
  { icon: Truck, label: "Distribuidoras y mayoristas" },
  { icon: Wrench, label: "Ferreterías" },
  { icon: Cross, label: "Farmacias" },
  { icon: ShoppingBasket, label: "Minimarkets" },
  { icon: Briefcase, label: "Servicios" },
];

const faqs = [
  { q: "¿Necesito instalar algo?", a: "No. erpCodify es 100 % web: entrás desde el navegador en la computadora, tablet o celular. Nada que instalar ni actualizar." },
  { q: "¿Sirve para facturar en Paraguay?", a: "Sí. Emitís facturas con tu timbrado del SET, IVA 10 % / 5 % / exenta, numeración automática y PDF listo para imprimir." },
  { q: "¿Puedo manejar más de una empresa?", a: "Sí. Desde una sola cuenta gestionás varias empresas, con los datos de cada una totalmente aislados." },
  { q: "¿Cómo controlo el dinero?", a: "Con el módulo de Finanzas: caja y bancos, cobranzas y pagos. Cada cobro y pago impacta en tu saldo, y ves cuánto te deben y cuánto debés." },
  { q: "¿Mis datos están seguros?", a: "Cada empresa está aislada del resto, cada usuario tiene roles y permisos por módulo, y hay una bitácora de auditoría de todas las operaciones." },
  { q: "¿Tiene costo?", a: "Podés crear tu empresa y probar todos los módulos. Registrate y empezá a usarlo en segundos." },
];

export default async function LandingPage() {
  const s = await getSession();

  return (
    <div className="min-h-dvh">
      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">erpCodify</span>
          </Link>
          <nav className="ml-6 hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#funciones" className="transition-colors hover:text-foreground">Funciones</a>
            <a href="#beneficios" className="transition-colors hover:text-foreground">Beneficios</a>
            <a href="#como" className="transition-colors hover:text-foreground">Cómo empezar</a>
            <a href="#faq" className="transition-colors hover:text-foreground">Preguntas</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle variant="surface" />
            {s ? (
              <Button asChild><Link href="/tablero">Ir al panel</Link></Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="hidden sm:inline-flex"><Link href="/login">Ingresar</Link></Button>
                <Button asChild><Link href="/registro">Crear empresa</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(var(--primary) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "radial-gradient(ellipse 75% 55% at 50% 0%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 55% at 50% 0%, black, transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24 lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" /> ERP para PYMEs · hecho en Paraguay
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Tu inventario, ventas y compras en <span className="text-primary">un solo lugar</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Un ERP simple y completo: controlá stock por depósito, facturá con timbrado, gestioná
              compras, cobranzas y pagos, y seguí tu caja y tus números en tiempo real.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href={s ? "/tablero" : "/registro"}>
                  {s ? "Ir al panel" : "Crear empresa gratis"} <ArrowRight className="size-4" />
                </Link>
              </Button>
              {!s && (
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Ya tengo cuenta</Link>
                </Button>
              )}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Sin tarjeta de crédito · listo en segundos</p>
          </div>

          {/* Mockup del tablero */}
          <HeroMockup />
        </div>

        {/* Strip de destacados */}
        <div className="border-y bg-muted/30">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 sm:px-6 md:grid-cols-4 lg:px-8">
            {[
              ["5 módulos", "integrados"],
              ["Timbrado SET", "e IVA Paraguay"],
              ["Multi-empresa", "datos aislados"],
              ["Tiempo real", "stock, ventas y caja"],
            ].map(([t, sub]) => (
              <div key={t} className="py-6 text-center">
                <div className="text-base font-semibold">{t}</div>
                <div className="text-xs text-muted-foreground">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Sectores ---------- */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ideal para tu rubro</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {sectores.map((x) => (
            <span key={x.label} className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm">
              <x.icon className="size-4 text-primary" /> {x.label}
            </span>
          ))}
        </div>
      </section>

      {/* ---------- Funciones ---------- */}
      <section id="funciones" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Todo lo que tu negocio necesita</h2>
          <p className="mt-4 text-muted-foreground">Cinco módulos integrados que trabajan juntos, sin planillas ni sistemas separados.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {funciones.map((f) => (
            <div key={f.titulo} className="group rounded-xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
              <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.titulo}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Beneficios ---------- */}
      <section id="beneficios" className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Hecho para operar de verdad</h2>
            <p className="mt-4 text-muted-foreground">
              No es una planilla glorificada. Cada venta descuenta stock, cada compra lo repone y cada
              movimiento queda registrado.
            </p>
            <ul className="mt-8 grid gap-4">
              {beneficios.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <Check className="size-3.5" />
                  </span>
                  <span className="text-sm">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Reponer stock</span>
              <AlertTriangle className="size-4 text-warning" />
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              {[
                ["Detergente 750ml", "4 / mín 10"],
                ["Yerba mate 500g", "8 / mín 10"],
                ["Gaseosa cola 2L", "12 / mín 15"],
              ].map(([p, q]) => (
                <div key={p} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span>{p}</span>
                  <span className="rounded-md bg-warning/15 px-2 py-0.5 text-xs font-medium text-foreground">{q}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="size-4 text-success" /> Alertas automáticas según el stock mínimo de cada producto.
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Cómo empezar ---------- */}
      <section id="como" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Empezás en 3 pasos</h2>
          <p className="mt-4 text-muted-foreground">De cero a facturando en minutos.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {pasos.map((p) => (
            <div key={p.n} className="relative rounded-xl border bg-card p-6">
              <div className="grid size-9 place-items-center rounded-full bg-primary font-semibold text-primary-foreground">{p.n}</div>
              <h3 className="mt-4 font-semibold">{p.titulo}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="border-y bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Preguntas frecuentes</h2>
            <p className="mt-4 text-muted-foreground">Lo que todos preguntan antes de empezar.</p>
          </div>
          <div className="mt-10 grid gap-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-xl border bg-card px-5 py-4 transition-colors hover:border-primary/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-sidebar px-6 py-14 text-center text-sidebar-foreground sm:px-12">
          <div
            className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
          />
          <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Empezá a ordenar tu negocio hoy
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-sidebar-foreground/80">
            Creá tu empresa gratis y probá todos los módulos. Sin instalaciones, sin tarjeta.
          </p>
          <div className="relative mt-8 flex justify-center">
            <Button size="lg" asChild>
              <Link href={s ? "/tablero" : "/registro"}>
                {s ? "Ir al panel" : "Crear empresa gratis"} <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Boxes className="size-5" />
                </div>
                <span className="text-lg font-semibold">erpCodify</span>
              </div>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                El ERP simple para gestionar inventario, ventas, compras y finanzas de tu PYME.
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold">Producto</div>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                <li><a href="#funciones" className="hover:text-foreground">Funciones</a></li>
                <li><a href="#beneficios" className="hover:text-foreground">Beneficios</a></li>
                <li><a href="#faq" className="hover:text-foreground">Preguntas frecuentes</a></li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold">Cuenta</div>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-foreground">Ingresar</Link></li>
                <li><Link href="/registro" className="hover:text-foreground">Crear empresa</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} erpCodify · Hecho en Paraguay 🇵🇾</p>
            <p>Inventario · Ventas · Compras · Finanzas</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Mockup estilizado del tablero para el hero. */
function HeroMockup() {
  const barras = [40, 65, 50, 80, 55, 90, 70, 95, 60, 85, 75, 100];
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-4 rounded-[1.75rem] bg-primary/10 blur-2xl" aria-hidden />
      <div className="relative rounded-2xl border bg-card p-5 shadow-xl">
      <div className="flex items-center gap-1.5 pb-4">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-warning/70" />
        <span className="size-2.5 rounded-full bg-success/70" />
        <span className="ml-2 text-xs text-muted-foreground">Tablero · erpCodify</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Ventas del mes", "₲ 12.4M"],
          ["Inventario", "₲ 8.1M"],
          ["Por recibir", "₲ 3.2M"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border bg-background p-3">
            <div className="text-[10px] text-muted-foreground">{k}</div>
            <div className="mt-1 text-sm font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border bg-background p-3">
        <div className="mb-2 text-[10px] text-muted-foreground">Ventas últimos 14 días</div>
        <div className="flex h-24 items-end gap-1.5">
          {barras.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-sm bg-primary/80" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
