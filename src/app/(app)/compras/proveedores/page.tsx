import { ContactosList } from "@/components/contactos";

export const metadata = { title: "Proveedores" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <ContactosList tipo="proveedor" q={q} />;
}
