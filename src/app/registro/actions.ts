"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, cookieOpts, firmarSesion } from "@/lib/session";
import { sembrarEjemplos } from "@/lib/ejemplos";
import { auditar, sinSecretos } from "@/lib/auditoria";
import { ErrorNegocio, formObj, mensajeError, zodMsg, type ActionState } from "@/lib/action";

const schema = z
  .object({
    razonSocial: z.string().trim().min(2, "Ingresá el nombre de la empresa"),
    nombre: z.string().trim().min(2, "Ingresá tu nombre"),
    email: z.string().trim().toLowerCase().email("Email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmar: z.string(),
  })
  .refine((d) => d.password === d.confirmar, {
    path: ["confirmar"],
    message: "Las contraseñas no coinciden",
  });

/**
 * Alta de autoservicio: crea una empresa nueva, su rol Administrador y su primer
 * usuario (el que se registra), que queda activo y logueado como administrador.
 */
export async function registrarse(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const p = schema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { razonSocial, nombre, email, password } = p.data;

    // El email es único a nivel global: una persona = una empresa.
    if (await prisma.usuario.findUnique({ where: { email } })) {
      throw new ErrorNegocio("Ya existe una cuenta con ese email");
    }

    const passwordHash = await bcrypt.hash(password, 10); // fuera de la transacción (es lento)
    const hoy = new Date();

    const { empresa, usuario, rol } = await prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: {
          razonSocial,
          // RUC y timbrado quedan como placeholder; el admin los completa en Configuración → Empresa.
          ruc: "",
          activo: true,
          timbrado: "00000000",
          timbradoInicio: new Date(Date.UTC(hoy.getUTCFullYear(), 0, 1)),
          timbradoFin: new Date(Date.UTC(hoy.getUTCFullYear(), 11, 31)),
        },
      });
      const rol = await tx.rol.create({
        data: { empresaId: empresa.id, nombre: "Administrador", permisos: ["inventario", "ventas", "compras", "configuracion"] },
      });
      const usuario = await tx.usuario.create({
        data: { empresaId: empresa.id, nombre, email, passwordHash, activo: true, rolId: rol.id },
      });
      // Datos de ejemplo para que la empresa arranque con algo cargado.
      await sembrarEjemplos(tx, empresa.id);
      return { empresa, usuario, rol };
    }, { timeout: 15000 });

    await auditar({
      modulo: "seguridad",
      entidad: "Empresa",
      entidadId: empresa.id,
      accion: "REGISTRO",
      resumen: `Se registró la empresa ${razonSocial} con su administrador ${nombre} (${email})`,
      despues: sinSecretos(usuario),
      usuario: { id: usuario.id, nombre: usuario.nombre },
      empresaId: empresa.id,
    });

    // Auto-login: el administrador entra directo a su empresa recién creada.
    const token = await firmarSesion({
      userId: usuario.id,
      empresaId: empresa.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: rol.nombre,
      permisos: rol.permisos,
      esSuperAdmin: usuario.esSuperAdmin,
    });
    (await cookies()).set(SESSION_COOKIE, token, cookieOpts);
    await auditar({ modulo: "seguridad", entidad: "Usuario", entidadId: usuario.id, accion: "LOGIN", resumen: "Inició sesión", usuario: { id: usuario.id, nombre: usuario.nombre }, empresaId: empresa.id });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  // Fuera del try: el redirect lanza NEXT_REDIRECT y no debe tratarse como error.
  redirect("/");
}
