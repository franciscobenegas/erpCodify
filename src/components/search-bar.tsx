import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Búsqueda por querystring (?q=), sin JavaScript. */
export function SearchBar({ q, placeholder = "Buscar…", children }: { q?: string; placeholder?: string; children?: React.ReactNode }) {
  return (
    <form className="mb-4 flex flex-wrap gap-2">
      <div className="relative min-w-56 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder={placeholder} className="pl-8" />
      </div>
      {children}
    </form>
  );
}
