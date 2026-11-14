import type { Prisma } from "@prisma/client";
import { getTenant } from "@/lib/auth";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { Input, NativeSelect } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Auditoría" };
export const dynamic = "force-dynamic";

const LIMITE = 300;

const MODULOS: Record<string, string> = {
  inventario: "Inventario", ventas: "Ventas", compras: "Compras", configuracion: "Configuración", seguridad: "Seguridad",
};

const ACCIONES: Record<string, string> = {
  CREAR: "Creó", EDITAR: "Editó", ELIMINAR: "Eliminó", EMITIR: "Emitió", ANULAR: "Anuló",
  CONFIRMAR: "Confirmó", CANCELAR: "Canceló", RECIBIR: "Recibió", AJUSTE: "Ajuste",
  TRANSFERENCIA: "Transferencia", LOGIN: "Ingreso", LOGOUT: "Salida", REGISTRO: "Registro",
};

type Variante = React.ComponentProps<typeof Badge>["variant"];
const COLOR: Record<string, Variante> = {
  CREAR: "success", REGISTRO: "success",
  EDITAR: "default", EMITIR: "default", CONFIRMAR: "default", RECIBIR: "default",
  ELIMINAR: "destructive", ANULAR: "destructive", CANCELAR: "destructive",
  AJUSTE: "secondary", TRANSFERENCIA: "secondary", LOGIN: "outline", LOGOUT: "outline",
};

const fechaHora = new Intl.DateTimeFormat("es-PY", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Asuncion" });

/** Convierte un valor del snapshot a texto legible y breve. */
function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (Array.isArray(v)) return v.length ? v.map(fmt).join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

type Datos = {
  antes?: Record<string, unknown> | null;
  despues?: Record<string, unknown> | null;
  diff?: Record<string, { antes: unknown; despues: unknown }> | null;
};

function Detalle({ datos }: { datos: Datos | null }) {
  if (!datos) return <span className="text-muted-foreground">—</span>;
  const { diff, despues, antes } = datos;

  if (diff && Object.keys(diff).length) {
    return (
      <Disclosure resumen={`${Object.keys(diff).length} campo(s) modificado(s)`}>
        <table className="w-full text-xs">
          <tbody>
            {Object.entries(diff).map(([campo, { antes: a, despues: d }]) => (
              <tr key={campo} className="border-b last:border-0">
                <td className="py-1 pr-3 font-medium text-foreground">{campo}</td>
                <td className="py-1 pr-2 text-muted-foreground line-through">{fmt(a)}</td>
                <td className="py-1 text-success">{fmt(d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Disclosure>
    );
  }

  const snap = despues ?? antes;
  if (snap && typeof snap === "object") {
    const entradas = Object.entries(snap).filter(([k]) => k !== "passwordHash");
    return (
      <Disclosure resumen={despues ? "Datos creados" : "Datos eliminados"}>
        <table className="w-full text-xs">
          <tbody>
            {entradas.map(([k, v]) => (
              <tr key={k} className="border-b last:border-0">
                <td className="py-1 pr-3 font-medium text-foreground">{k}</td>
                <td className="py-1 text-muted-foreground">{fmt(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Disclosure>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

/** Desplegable nativo (sin JS). */
function Disclosure({ resumen, children }: { resumen: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="cursor-pointer select-none text-xs text-primary hover:underline">{resumen}</summary>
      <div className="mt-2 max-w-md overflow-x-auto rounded-md border bg-muted/30 p-2">{children}</div>
    </details>
  );
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; modulo?: string; accion?: string; desde?: string; hasta?: string }>;
}) {
  const { db } = await getTenant("configuracion");
  const { q, modulo, accion, desde, hasta } = await searchParams;

  const where: Prisma.AuditoriaWhereInput = {};
  if (modulo) where.modulo = modulo;
  if (accion) where.accion = accion;
  if (q) {
    where.OR = [
      { resumen: { contains: q, mode: "insensitive" } },
      { entidad: { contains: q, mode: "insensitive" } },
      { usuarioNombre: { contains: q, mode: "insensitive" } },
      { entidadId: { contains: q, mode: "insensitive" } },
    ];
  }
  if (desde || hasta) {
    where.fecha = {
      ...(desde ? { gte: new Date(`${desde}T00:00:00`) } : {}),
      ...(hasta ? { lte: new Date(`${hasta}T23:59:59.999`) } : {}),
    };
  }

  const registros = await db.auditoria.findMany({ where, orderBy: { fecha: "desc" }, take: LIMITE });

  return (
    <>
      <PageHeader
        title="Auditoría"
        description={`Bitácora de todas las operaciones del sistema (últimos ${LIMITE} registros que coinciden con el filtro).`}
      />

      <form className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <Input name="q" defaultValue={q} placeholder="Buscar: resumen, usuario, entidad…" className="lg:col-span-2" />
        <NativeSelect name="modulo" defaultValue={modulo ?? ""}>
          <option value="">Todos los módulos</option>
          {Object.entries(MODULOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </NativeSelect>
        <NativeSelect name="accion" defaultValue={accion ?? ""}>
          <option value="">Todas las acciones</option>
          {Object.entries(ACCIONES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </NativeSelect>
        <Input name="desde" type="date" defaultValue={desde} aria-label="Desde" />
        <Input name="hasta" type="date" defaultValue={hasta} aria-label="Hasta" />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <Button type="submit">Filtrar</Button>
          <Button asChild variant="outline"><a href="/configuracion/auditoria">Limpiar</a></Button>
        </div>
      </form>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Qué pasó</TableHead>
              <TableHead>Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registros.length === 0 && <EmptyRow cols={6}>No hay operaciones registradas con ese filtro.</EmptyRow>}
            {registros.map((r) => (
              <TableRow key={r.id} className="align-top">
                <TableCell className="text-muted-foreground">{fechaHora.format(r.fecha)}</TableCell>
                <TableCell className="font-medium">{r.usuarioNombre ?? "Sistema"}</TableCell>
                <TableCell>{r.modulo ? MODULOS[r.modulo] ?? r.modulo : "—"}</TableCell>
                <TableCell><Badge variant={COLOR[r.accion] ?? "secondary"}>{ACCIONES[r.accion] ?? r.accion}</Badge></TableCell>
                <TableCell className="whitespace-normal">
                  <div>{r.resumen}</div>
                  <div className="text-xs text-muted-foreground">{r.entidad}{r.entidadId ? ` · ${r.entidadId}` : ""}</div>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <Detalle datos={r.datos as Datos | null} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
