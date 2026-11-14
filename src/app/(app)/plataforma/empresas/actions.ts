"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import { auditar } from "@/lib/auditoria";
import { ErrorNegocio, formObj, mensajeError, zodMsg, type ActionState } from "@/lib/action";

const empresaSchema = z.object({
  razonSocial: z.string().trim().min(2, "requerido"),
  ruc: z.string().trim().regex(/^\d{5,8}-\d$/, "formato 80000000-1"),
  adminNombre: z.string().trim().min(2, "requerido"),
  adminEmail: z.string().trim().toLowerCase().email("email inválido"),
  adminPassword: z.string().min(6, "mínimo 6 caracteres"),
});

/** Crea una empresa nueva con su rol Administrador y su primer usuario admin. */
export async function crearEmpresa(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await requireSuperAdmin();
    const p = empresaSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { razonSocial, ruc, adminNombre, adminEmail, adminPassword } = p.data;

    if (await prisma.usuario.findUnique({ where: { email: adminEmail } }))
      throw new ErrorNegocio("Ya existe un usuario con ese email.");

    const passwordHash = await bcrypt.hash(adminPassword, 10); // fuera de la transacción (es lento)
    const hoy = new Date();

    const empresa = await prisma.$transaction(async (tx) => {
      const emp = await tx.empresa.create({
        data: {
          razonSocial,
          ruc,
          activo: true,
          // Timbrado placeholder: el admin de la empresa lo completa en Configuración → Empresa.
          timbrado: "00000000",
          timbradoInicio: new Date(Date.UTC(hoy.getUTCFullYear(), 0, 1)),
          timbradoFin: new Date(Date.UTC(hoy.getUTCFullYear(), 11, 31)),
        },
      });
      const rol = await tx.rol.create({
        data: { empresaId: emp.id, nombre: "Administrador", permisos: ["inventario", "ventas", "compras", "configuracion"] },
      });
      await tx.usuario.create({
        data: { empresaId: emp.id, nombre: adminNombre, email: adminEmail, passwordHash, activo: true, rolId: rol.id },
      });
      return emp;
    });

    await auditar({
      modulo: "seguridad",
      entidad: "Empresa",
      entidadId: empresa.id,
      accion: "CREAR",
      resumen: `Creó la empresa ${razonSocial} con su administrador ${adminEmail}`,
      despues: empresa,
      empresaId: empresa.id,
    });

    revalidatePath("/plataforma/empresas");
    return { ok: `Empresa "${razonSocial}" creada con su administrador ${adminEmail}.` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

/** Activa o desactiva una empresa. Una empresa inactiva no permite iniciar sesión. */
export async function toggleEmpresaActiva(empresaId: number, _: ActionState): Promise<ActionState> {
  try {
    const s = await requireSuperAdmin();
    if (empresaId === s.empresaId) throw new ErrorNegocio("No podés desactivar tu propia empresa.");
    const emp = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!emp) throw new ErrorNegocio("La empresa no existe.");
    const despues = await prisma.empresa.update({ where: { id: empresaId }, data: { activo: !emp.activo } });
    await auditar({ modulo: "seguridad", entidad: "Empresa", entidadId: empresaId, accion: "EDITAR", resumen: `${despues.activo ? "Activó" : "Desactivó"} la empresa ${emp.razonSocial}`, empresaId });
    revalidatePath("/plataforma/empresas");
    return { ok: despues.activo ? "Empresa activada" : "Empresa desactivada" };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
