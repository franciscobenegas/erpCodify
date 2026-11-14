import "server-only";
import { prisma } from "./prisma";
import { scopePrisma } from "./tenant-scope";

/**
 * Cliente Prisma scopeado a una empresa (tenant). Es una extensión que inyecta
 * `empresaId` automáticamente en cada operación de los modelos de negocio:
 *   - lecturas / updates / deletes → se agrega al `where`
 *   - creates / upserts            → se agrega al `data` / `create`
 *
 * Así una empresa nunca ve ni toca datos de otra, aunque el llamador olvide el
 * filtro. Para creates, el tipo generado igual exige `empresaId`, por lo que el
 * llamador lo pasa explícito y esta inyección actúa como red de seguridad.
 *
 * LIMITACIONES (importante):
 *  - No valida FKs: si una action recibe un `clienteId`/`depositoId`/`rolId` del
 *    formulario, hay que verificar que pertenezca a la empresa (ver pertenece()).
 *  - No scopea relaciones anidadas (include/nested); el aislamiento ahí se mantiene
 *    porque todo registro referencia FKs de su misma empresa (se valida al crear).
 *  - Los raw queries ($queryRaw/$executeRaw) NO pasan por la extensión.
 */
export function tenantDb(empresaId: number) {
  return scopePrisma(prisma, empresaId);
}

export type TenantDb = ReturnType<typeof tenantDb>;
