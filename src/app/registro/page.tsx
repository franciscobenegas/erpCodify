import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { registrarse } from "./actions";

export const metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <AuthShell
      title="Creá tu cuenta"
      subtitle="Registrate para solicitar acceso al sistema."
      footer={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Ingresá
          </Link>
        </>
      }
    >
      <ActionForm action={registrarse} className="grid gap-4">
        <Field label="Código de invitación" htmlFor="codigo" hint="Te lo comparte el administrador de tu empresa">
          <Input id="codigo" name="codigo" required autoFocus />
        </Field>
        <Field label="Nombre completo" htmlFor="nombre">
          <Input id="nombre" name="nombre" autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Contraseña" htmlFor="password" hint="Mínimo 6 caracteres">
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </Field>
        <Field label="Confirmar contraseña" htmlFor="confirmar">
          <Input id="confirmar" name="confirmar" type="password" autoComplete="new-password" required />
        </Field>
        <SubmitButton className="mt-2 w-full">Crear cuenta</SubmitButton>
        <p className="text-center text-xs text-muted-foreground">
          Tu cuenta quedará pendiente de aprobación por un administrador.
        </p>
      </ActionForm>
    </AuthShell>
  );
}
