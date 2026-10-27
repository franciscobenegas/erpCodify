import { ContactoEdit } from "@/components/contactos";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContactoEdit tipo="proveedor" id={id} />;
}
