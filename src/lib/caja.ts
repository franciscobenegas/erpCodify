import "server-only";
import type { TipoMovimientoCaja, OrigenMovimientoCaja } from "@prisma/client";
import type { TenantDb } from "./tenant-db";
import { ErrorNegocio } from "./action";

// Cliente de transacción del cliente scopeado (ver stock.ts).
type Tx = Omit<TenantDb, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Único punto para mover plata: actualiza el saldo de la cuenta y registra el
 * movimiento. Siempre llamar dentro de una transacción. Bloquea egresos que
 * dejen la cuenta en negativo (salvo permitirNegativo).
 */
export async function moverCaja(
  tx: Tx,
  m: {
    empresaId: number;
    cuentaId: number;
    tipo: TipoMovimientoCaja; // INGRESO | EGRESO
    monto: number; // siempre positivo
    concepto: string;
    origen: OrigenMovimientoCaja;
    referencia?: string | null;
    usuarioId?: number;
    fecha?: Date;
    permitirNegativo?: boolean;
  },
) {
  if (m.monto <= 0) throw new ErrorNegocio("El monto debe ser mayor a 0.");

  const delta = m.tipo === "INGRESO" ? m.monto : -m.monto;
  const cuenta = await tx.cuentaFinanciera.update({
    where: { id: m.cuentaId },
    data: { saldo: { increment: delta } },
  });

  if (!m.permitirNegativo && Number(cuenta.saldo) < 0) {
    throw new ErrorNegocio(
      `Saldo insuficiente en "${cuenta.nombre}": quedaría en ${Number(cuenta.saldo)}.`,
    );
  }

  await tx.movimientoCaja.create({
    data: {
      empresaId: m.empresaId,
      cuentaId: m.cuentaId,
      tipo: m.tipo,
      monto: m.monto,
      concepto: m.concepto,
      origen: m.origen,
      referencia: m.referencia ?? null,
      usuarioId: m.usuarioId,
      ...(m.fecha ? { fecha: m.fecha } : {}),
    },
  });
}
