# ERP — Inventario, Ventas y Compras

ERP web inspirado en Odoo, hecho con **Next.js 15 (App Router) + React 19 + Tailwind CSS 4 + shadcn/ui + Prisma + PostgreSQL**, adaptado a Paraguay (guaraníes, IVA 5/10 incluido, timbrado y numeración `001-001-0000001`).

## Módulos

| Módulo | Qué hace |
|---|---|
| **Tablero** | Ventas del mes, valor del inventario, compras por recibir, productos bajo mínimo, ventas de 14 días |
| **Inventario** | Productos y categorías, depósitos, stock por depósito con valorización, ajustes (fijar/sumar/restar), transferencias e historial de movimientos |
| **Ventas** | Clientes, facturas (borrador → emitida → anulada) con PDF imprimible, total en letras y liquidación de IVA |
| **Compras** | Proveedores, órdenes de compra (borrador → confirmada → recibida). Al recibir ingresa stock y actualiza el costo |
| **Configuración** | Datos de empresa y timbrado, usuarios y roles con permisos por módulo |

## Puesta en marcha

Requisitos: Node 20+ y Docker (o un PostgreSQL propio).

```bash
npm install
cp .env.example .env          # editá AUTH_SECRET (openssl rand -base64 32)
docker compose up -d          # levanta PostgreSQL en el puerto 5432
npx prisma migrate dev --name init
npm run db:seed               # roles, admin, depósitos, productos y contactos de ejemplo
npm run dev
```

Entrar en http://localhost:3000 con **admin@erp.local / admin123** y cambiar la contraseña en Configuración → Usuarios.

Producción: `npm run build && npm start`. Si lo servís por HTTP (sin HTTPS) en la red local, agregá `AUTH_COOKIE_SECURE="false"` al `.env`; si no, el navegador no guarda la sesión.

## Reglas de negocio

- **Precios con IVA incluido.** IVA 10% = total / 11; IVA 5% = total / 21. La tasa la define el producto, no la línea.
- **Emitir factura** (en una transacción): valida timbrado vigente, reserva el número de forma atómica (dos cajas no pueden sacar el mismo número), descuenta stock del depósito elegido. Si falta stock, no se consume número.
- **Anular** repone el stock con movimientos `ANULACION_VENTA`. La factura queda con marca de agua ANULADA en el PDF.
- **Stock**: todo cambio pasa por `moverStock()` en `src/lib/stock.ts`, que actualiza el saldo y registra el movimiento. No se permite stock negativo.
- **Costo**: al recibir una compra se guarda el último costo. Para costo promedio ponderado, cambiarlo en `recibirOrden`.
- **Permisos**: cada rol habilita módulos (`inventario`, `ventas`, `compras`, `configuracion`). El middleware bloquea rutas y cada server action vuelve a validar. Los cambios de rol aplican al volver a iniciar sesión.

## Estructura

```
prisma/schema.prisma        modelo de datos
prisma/seed.ts              datos iniciales
src/middleware.ts           protección de rutas y permisos
src/lib/                    auth (JWT con jose), stock, IVA, PDF, utilidades
src/components/ui/          componentes shadcn/ui
src/components/             sidebar, formularios, editor de líneas, contactos
src/app/login/              ingreso
src/app/(app)/              pantallas del ERP (cada módulo con su actions.ts)
```

Para sumar componentes shadcn: `npx shadcn@latest add dialog` (ya está `components.json`).

## Próximos pasos sugeridos

- Factura electrónica SIFEN (el modelo ya guarda timbrado, establecimiento y punto de expedición)
- Notas de crédito parciales, cobros y cuentas por cobrar de ventas a crédito
- Presupuestos/pedidos de venta, listas de precios, lotes y vencimientos
- Reportes (libro IVA ventas/compras, kardex por producto) y exportación a Excel
