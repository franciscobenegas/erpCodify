import "server-only";
import { Prisma, type OrigenMovimiento } from "@prisma/client";
import { ErrorNegocio } from "./action";

type Tx = Prisma.TransactionClient;

/**
 * Único punto de entrada para cambiar stock: actualiza el saldo del depósito
 * y registra el movimiento. Siempre llamar dentro de una transacción.
 */
export async function moverStock(
  tx: Tx,
  m: {
    productoId: number;
    depositoId: number;
    cantidad: number; // + entra, - sale
    origen: OrigenMovimiento;
    referencia?: string;
    nota?: string | null;
    usuarioId?: number;
    permitirNegativo?: boolean;
  },
) {
  if (m.cantidad === 0) return;

  const stock = await tx.stock.upsert({
    where: { productoId_depositoId: { productoId: m.productoId, depositoId: m.depositoId } },
    create: { productoId: m.productoId, depositoId: m.depositoId, cantidad: m.cantidad },
    update: { cantidad: { increment: m.cantidad } },
    include: { producto: { select: { nombre: true } }, deposito: { select: { nombre: true } } },
  });

  if (!m.permitirNegativo && Number(stock.cantidad) < 0) {
    throw new ErrorNegocio(
      `Stock insuficiente de "${stock.producto.nombre}" en ${stock.deposito.nombre} ` +
        `(faltan ${Math.abs(Number(stock.cantidad))}).`,
    );
  }

  await tx.movimientoStock.create({
    data: {
      productoId: m.productoId,
      depositoId: m.depositoId,
      cantidad: m.cantidad,
      origen: m.origen,
      referencia: m.referencia,
      nota: m.nota,
      usuarioId: m.usuarioId,
    },
  });
}
