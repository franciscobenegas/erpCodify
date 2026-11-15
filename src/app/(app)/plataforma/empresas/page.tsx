import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import { formatFecha } from "@/lib/utils";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { AccionBoton } from "@/components/accion-boton";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { crearEmpresa, toggleEmpresaActiva } from "./actions";

export const metadata = { title: "Empresas" };
export const dynamic = "force-dynamic";

export default async function PlataformaEmpresasPage() {
  const s = await requireSuperAdmin();
  const empresas = await prisma.empresa.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { usuarios: true } } },
  });

  return (
    <>
      <PageHeader
        title="Empresas"
        description="Administración de plataforma: alta de empresas y códigos de invitación."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-right">Usuarios</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.length === 0 && <EmptyRow cols={4}>Todavía no hay empresas.</EmptyRow>}
              {empresas.map((e) => (
                <TableRow key={e.id} className={!e.activo ? "opacity-60" : undefined}>
                  <TableCell>
                    <div className="font-medium">{e.razonSocial}</div>
                    <div className="text-xs text-muted-foreground">RUC {e.ruc || "—"} · desde {formatFecha(e.createdAt)}</div>
                  </TableCell>
                  <TableCell className="text-right">{e._count.usuarios}</TableCell>
                  <TableCell>
                    {e.activo ? <Badge variant="success">Activa</Badge> : <Badge variant="secondary">Inactiva</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      {e.id !== s.empresaId && (
                        <AccionBoton
                          action={toggleEmpresaActiva.bind(null, e.id)}
                          variant={e.activo ? "ghost" : "default"}
                          confirm={e.activo ? `¿Desactivar "${e.razonSocial}"? Sus usuarios no podrán ingresar.` : undefined}
                        >
                          {e.activo ? "Desactivar" : "Activar"}
                        </AccionBoton>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Nueva empresa</CardTitle>
            <CardDescription>
              Se crea la empresa, su rol Administrador y su primer usuario. El timbrado se completa luego en
              Configuración → Empresa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={crearEmpresa} className="grid gap-4">
              <Field label="Razón social"><Input name="razonSocial" required /></Field>
              <Field label="RUC" hint="Con dígito verificador, ej. 80012345-6"><Input name="ruc" required /></Field>
              <div className="border-t pt-4 text-sm font-medium">Administrador de la empresa</div>
              <Field label="Nombre"><Input name="adminNombre" required /></Field>
              <Field label="Email"><Input name="adminEmail" type="email" autoComplete="off" required /></Field>
              <Field label="Contraseña" hint="Mínimo 6 caracteres"><Input name="adminPassword" type="password" autoComplete="new-password" required /></Field>
              <div className="flex gap-2">
                <SubmitButton>Crear empresa</SubmitButton>
                <Button type="reset" variant="ghost">Cancelar</Button>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
