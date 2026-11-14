import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { getTenant } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { AccionBoton } from "@/components/accion-boton";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Input, NativeSelect } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { guardarUsuario, eliminarUsuario } from "../actions";

export default async function UsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nuevo = id === "nuevo";
  const { s, db } = await getTenant("configuracion");
  const [u, roles] = await Promise.all([
    nuevo ? null : db.usuario.findUnique({ where: { id: Number(id) } }),
    db.rol.findMany({ orderBy: { nombre: "asc" } }),
  ]);
  if (!nuevo && !u) notFound();

  const esPropio = !nuevo && u!.id === s.userId;

  return (
    <>
      <PageHeader
        title={nuevo ? "Nuevo usuario" : u!.nombre}
        actions={
          !nuevo && !esPropio && (
            <AccionBoton
              action={eliminarUsuario.bind(null, u!.id)}
              variant="destructive"
              confirm={`¿Eliminar al usuario "${u!.nombre}"? Esta acción no se puede deshacer.`}
            >
              <Trash2 /> Eliminar
            </AccionBoton>
          )
        }
      />
      <Card className="max-w-xl">
        <CardContent className="pt-5">
          <ActionForm action={guardarUsuario} className="grid gap-4">
            <input type="hidden" name="id" value={u?.id ?? ""} />
            <Field label="Nombre"><Input name="nombre" defaultValue={u?.nombre} required /></Field>
            <Field label="Email"><Input name="email" type="email" defaultValue={u?.email} required /></Field>
            <Field label="Rol">
              <NativeSelect name="rolId" defaultValue={u?.rolId ?? ""} required>
                <option value="" disabled>Elegí un rol…</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </NativeSelect>
            </Field>
            <Field label={nuevo ? "Contraseña" : "Nueva contraseña"} hint={nuevo ? "Mínimo 6 caracteres" : "Dejar vacío para no cambiarla"}>
              <Input name="password" type="password" autoComplete="new-password" required={nuevo} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="activo" defaultChecked={u?.activo ?? true} className="size-4" /> Usuario activo
            </label>
            <div><SubmitButton>Guardar</SubmitButton></div>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
