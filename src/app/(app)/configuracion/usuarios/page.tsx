import Link from "next/link";
import { Plus } from "lucide-react";
import { getTenant } from "@/lib/auth";
import { MODULOS } from "@/lib/permisos";
import { PageHeader } from "@/components/page-header";
import { ActionForm, SubmitButton } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { guardarRol } from "./actions";

export const metadata = { title: "Usuarios y roles" };

function RolForm({ rol }: { rol?: { id: number; nombre: string; permisos: string[] } }) {
  return (
    <ActionForm action={guardarRol} className="grid gap-3 rounded-lg border p-4">
      <input type="hidden" name="id" value={rol?.id ?? ""} />
      <Input name="nombre" defaultValue={rol?.nombre} placeholder="Nombre del rol" required />
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {MODULOS.map((m) => (
          <label key={m.key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="permisos" value={m.key} defaultChecked={rol?.permisos.includes(m.key)} className="size-4 accent-[var(--primary)]" />
            {m.label}
          </label>
        ))}
      </div>
      <div>
        <SubmitButton size="sm" variant={rol ? "outline" : "default"}>{rol ? "Guardar" : "Crear rol"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export default async function UsuariosPage() {
  const { db } = await getTenant("configuracion");
  const [usuarios, roles] = await Promise.all([
    db.usuario.findMany({ include: { rol: true }, orderBy: { nombre: "asc" } }),
    db.rol.findMany({ orderBy: { nombre: "asc" }, include: { _count: { select: { usuarios: true } } } }),
  ]);

  return (
    <>
      <PageHeader
        title="Usuarios y roles"
        actions={
          <Button asChild>
            <Link href="/configuracion/usuarios/nuevo"><Plus /> Nuevo usuario</Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link href={`/configuracion/usuarios/${u.id}`} className="font-medium text-primary hover:underline">{u.nombre}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.rol.nombre}</TableCell>
                  <TableCell>{u.activo ? <Badge variant="success">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>Cada rol habilita módulos del menú.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {roles.map((r) => (
              <div key={r.id}>
                <div className="mb-1 text-xs text-muted-foreground">{r._count.usuarios} usuario(s)</div>
                <RolForm rol={r} />
              </div>
            ))}
            <div className="mt-2 text-sm font-medium">Nuevo rol</div>
            <RolForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
