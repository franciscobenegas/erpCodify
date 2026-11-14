"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auditar, sinSecretos } from "@/lib/auditoria";
import { ErrorNegocio, formObj, mensajeError, zodMsg, type ActionState } from "@/lib/action";

// Rol que reciben las cuentas auto-registradas: sin módulos habilitados.
// Un administrador le asigna el rol real y lo activa desde Configuración › Usuarios.
const ROL_PENDIENTE = "Pendiente";

const schema = z
  .object({
    codigo: z.string().trim().min(1, "Ingresá el código de invitación"),
    nombre: z.string().trim().min(2, "Ingresá tu nombre"),
    email: z.string().trim().toLowerCase().email("Email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmar: z.string(),
  })
  .refine((d) => d.password === d.confirmar, {
    path: ["confirmar"],
    message: "Las contraseñas no coinciden",
  });

export async function registrarse(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const p = schema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { codigo, nombre, email, password } = p.data;

    // El código de invitación determina a qué empresa se suma el nuevo usuario.
    const empresa = await prisma.empresa.findUnique({ where: { codigoInvitacion: codigo } });
    if (!empresa || !empresa.activo) {
      throw new ErrorNegocio("Código de invitación inválido. Pedile uno nuevo al administrador de la empresa.");
    }

    // El email es único a nivel global: una persona = una empresa.
    if (await prisma.usuario.findUnique({ where: { email } })) {
      throw new ErrorNegocio("Ya existe una cuenta con ese email");
    }

    // Rol sin permisos dentro de esa empresa (se crea la primera vez que alguien se registra en ella).
    const rol = await prisma.rol.upsert({
      where: { empresaId_nombre: { empresaId: empresa.id, nombre: ROL_PENDIENTE } },
      update: {},
      create: { empresaId: empresa.id, nombre: ROL_PENDIENTE, permisos: [] },
    });

    const nuevo = await prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        nombre,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        activo: false, // pendiente de aprobación por un administrador
        rolId: rol.id,
      },
    });

    await auditar({
      modulo: "seguridad",
      entidad: "Usuario",
      entidadId: nuevo.id,
      accion: "REGISTRO",
      resumen: `Se registró una nueva cuenta: ${nombre} (${email}), pendiente de aprobación`,
      despues: sinSecretos(nuevo),
      usuario: { id: nuevo.id, nombre: nuevo.nombre },
      empresaId: empresa.id,
    });

    return {
      ok: "¡Cuenta creada! Un administrador debe aprobar tu acceso antes de que puedas ingresar.",
    };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
