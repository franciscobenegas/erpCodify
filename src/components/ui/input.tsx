import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "flex w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(base, "h-9", className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(base, "min-h-20 py-2", className)} {...props} />;
}

/** Select nativo con estilo shadcn: funciona sin JS y dentro de server forms. */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select data-slot="select" className={cn(base, "h-9 pr-8", className)} {...props} />;
}

export { Input, Textarea, NativeSelect };
