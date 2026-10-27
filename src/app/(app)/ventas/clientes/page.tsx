import { ContactosList } from "@/components/contactos";

export const metadata = { title: "Clientes" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <ContactosList tipo="cliente" q={q} />;
}
