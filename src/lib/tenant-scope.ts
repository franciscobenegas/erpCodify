import type { PrismaClient } from "@prisma/client";

/**
 * Lógica pura de aislamiento multi-empresa (sin "server-only" para poder testearla).
 * tenant-db.ts la envuelve con "server-only". Ver tenant-db.ts para el detalle del
 * comportamiento y las limitaciones (relaciones anidadas, raw queries).
 */

export const MODELOS_TENANT = new Set<string>([
  "Usuario",
  "Rol",
  "Categoria",
  "Marca",
  "ModeloProducto",
  "UnidadMedida",
  "Producto",
  "ProductoUnidad",
  "ProductoPrecio",
  "Deposito",
  "Stock",
  "MovimientoStock",
  "Contacto",
  "Factura",
  "OrdenCompra",
  "Auditoria",
  "CuentaFinanciera",
  "MovimientoCaja",
  "Cobro",
  "Pago",
  "FormaPago",
  "CuentaGasto",
  "CentroCosto",
]);

type Obj = Record<string, unknown>;
type Args = { where?: Obj; data?: unknown; create?: Obj } & Obj;

/** Inyecta `empresaId` en los args de una operación según su tipo. */
export function conEmpresa(operation: string, rawArgs: unknown, empresaId: number): unknown {
  const args: Args = { ...(rawArgs as Args) };
  const scopeWhere = () => {
    args.where = { ...(args.where ?? {}), empresaId };
  };

  switch (operation) {
    case "create":
      args.data = { ...(args.data as Obj), empresaId };
      break;
    case "createMany":
    case "createManyAndReturn":
      args.data = Array.isArray(args.data)
        ? args.data.map((d) => ({ ...(d as Obj), empresaId }))
        : { ...(args.data as Obj), empresaId };
      break;
    case "upsert":
      scopeWhere();
      args.create = { ...(args.create ?? {}), empresaId };
      break;
    // find*, count, aggregate, groupBy, update*, delete* y cualquier otra: scopear por where.
    default:
      scopeWhere();
  }
  return args;
}

/** Devuelve un cliente Prisma extendido que auto-scopea los modelos de negocio a `empresaId`. */
export function scopePrisma(client: PrismaClient, empresaId: number) {
  return client.$extends({
    name: "tenant",
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (model && MODELOS_TENANT.has(model)) {
            return query(conEmpresa(operation, args, empresaId) as typeof args);
          }
          return query(args);
        },
      },
    },
  });
}
