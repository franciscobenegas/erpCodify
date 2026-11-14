import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { login } from "./actions";

export const metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell
      title="Ingresá a tu cuenta"
      subtitle="Usá tu email y contraseña para continuar."
      footer={
        <>
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="font-medium text-primary hover:underline">
            Registrate
          </Link>
        </>
      }
    >
      <ActionForm action={login} className="grid gap-4">
        <input type="hidden" name="next" value={next ?? "/"} />
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </Field>
        <Field label="Contraseña" htmlFor="password">
          <PasswordInput id="password" name="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton className="mt-2 w-full">Ingresar</SubmitButton>
      </ActionForm>
    </AuthShell>
  );
}
