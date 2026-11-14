"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboOption = { value: string; label: string; keywords?: string };

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Combo con búsqueda. Dos modos de uso:
 *  - Controlado: pasá `value` + `onChange`.
 *  - En un form: pasá `name` (y opcional `defaultValue`); renderiza un input oculto
 *    que se envía con el form. También acepta `value`/`onChange` si lo querés controlar.
 */
export function Combobox({
  options,
  value: valueProp,
  defaultValue,
  onChange,
  name,
  placeholder = "Seleccionar…",
  searchPlaceholder = "Buscar…",
  emptyText = "Sin resultados",
  className,
  id,
  disabled,
  createLabel,
  onCreate,
  "aria-label": ariaLabel,
}: {
  options: ComboOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  /** Si se define junto con onCreate, muestra una acción para dar de alta. */
  createLabel?: string;
  /** Recibe el texto buscado actual; abrí tu propio popup de alta. */
  onCreate?: (query: string) => void;
  "aria-label"?: string;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "");
  const value = valueProp !== undefined ? valueProp : uncontrolled;

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = React.useMemo(() => {
    const q = norm(query.trim());
    if (!q) return options;
    const terms = q.split(/\s+/);
    return options.filter((o) => {
      const hay = norm(`${o.label} ${o.keywords ?? ""}`);
      return terms.every((t) => hay.includes(t));
    });
  }, [options, query]);

  const commit = (v: string) => {
    if (valueProp === undefined) setUncontrolled(v);
    onChange?.(v);
    setOpen(false);
    setQuery("");
  };

  const crear = () => {
    const q = query.trim();
    setOpen(false);
    setQuery("");
    onCreate?.(q);
  };

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  React.useEffect(() => {
    if (open) {
      setActive(Math.max(0, filtered.findIndex((o) => o.value === value)));
      // enfocar el buscador al abrir
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  React.useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) commit(opt.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const showCreate = Boolean(onCreate);

  const triggerBase =
    "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name && <input type="hidden" name={name} value={value} />}

      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        className={triggerBase}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="h-9 w-full bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 && !showCreate && (
              <li className="px-2 py-4 text-center text-sm text-muted-foreground">{emptyText}</li>
            )}
            {filtered.map((o, i) => {
              const isSel = o.value === value;
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={isSel}
                  data-active={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(o.value)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                    i === active && "bg-accent text-accent-foreground",
                  )}
                >
                  <Check className={cn("size-4 shrink-0", isSel ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{o.label}</span>
                </li>
              );
            })}
          </ul>
          {showCreate && (
            <button
              type="button"
              onClick={crear}
              className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm text-primary hover:bg-accent"
            >
              <Plus className="size-4 shrink-0" />
              <span className="truncate">
                {query.trim() ? `${createLabel ?? "Crear"} «${query.trim()}»` : createLabel ?? "Crear nuevo…"}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
