import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { registrarse } from "./actions";

export const metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <AuthShell
      title="Creá tu empresa"
      subtitle="Registrá tu empresa y empezá a gestionar tu negocio."
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
        <Field label="Nombre de la empresa" htmlFor="razonSocial" hint="Podés completar el RUC y el timbrado después, en Configuración">
          <Input id="razonSocial" name="razonSocial" required autoFocus />
        </Field>
        <Field label="Tu nombre" htmlFor="nombre">
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
        <SubmitButton className="mt-2 w-full">Crear empresa y entrar</SubmitButton>
        <p className="text-center text-xs text-muted-foreground">
          Vas a ser el administrador de tu empresa, con acceso completo.
        </p>
      </ActionForm>
    </AuthShell>
  );
}
