import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Contacto, Empresa, Factura, FacturaLinea } from "@prisma/client";
import { formatFecha, formatFechaPura, formatQty, toNum } from "./utils";
import { numeroALetras } from "./numero-letras";
import { nombreComprobante } from "./comprobante";

const gs = (v: unknown) => new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(toNum(v as number));

const s = StyleSheet.create({
  page: { padding: 28, fontSize: 8.5, fontFamily: "Helvetica", color: "#111" },
  row: { flexDirection: "row" },
  box: { border: "1pt solid #333", borderRadius: 3, padding: 8 },
  h1: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#555" },
  th: { fontFamily: "Helvetica-Bold", backgroundColor: "#eee", paddingVertical: 4, paddingHorizontal: 3, borderBottom: "1pt solid #333" },
  td: { paddingVertical: 3, paddingHorizontal: 3, borderBottom: "0.5pt solid #ccc" },
  right: { textAlign: "right" },
  anulada: { position: "absolute", top: 300, left: 90, fontSize: 90, color: "#d00", opacity: 0.15, transform: "rotate(-30deg)", fontFamily: "Helvetica-Bold" },
});

const cols = [
  { w: "8%", key: "cant", label: "Cant." },
  { w: "31%", key: "desc", label: "Descripción" },
  { w: "13%", key: "pu", label: "Precio unit." },
  { w: "12%", key: "dto", label: "Desc." },
  { w: "12%", key: "ex", label: "Exentas" },
  { w: "12%", key: "g5", label: "5%" },
  { w: "12%", key: "g10", label: "10%" },
];

export function FacturaPDF({
  empresa: e,
  factura: f,
}: {
  empresa: Empresa;
  factura: Factura & { cliente: Contacto; lineas: FacturaLinea[] };
}) {
  return (
    <Document title={`Factura ${f.numero}`}>
      <Page size="A4" style={s.page}>
        {f.estado === "ANULADA" && <Text style={s.anulada}>ANULADA</Text>}

        {/* Cabecera */}
        <View style={[s.row, { gap: 8 }]}>
          <View style={[s.box, { flex: 3 }]}>
            <Text style={s.h1}>{e.razonSocial}</Text>
            {e.direccion && <Text style={s.muted}>{e.direccion}</Text>}
            {e.telefono && <Text style={s.muted}>Tel.: {e.telefono}</Text>}
            {e.email && <Text style={s.muted}>{e.email}</Text>}
          </View>
          <View style={[s.box, { flex: 2, alignItems: "center", gap: 2 }]}>
            <Text>Timbrado N° <Text style={s.bold}>{f.timbrado}</Text></Text>
            <Text style={s.muted}>Vigencia: {formatFechaPura(e.timbradoInicio)} al {formatFechaPura(e.timbradoFin)}</Text>
            <Text>RUC: <Text style={s.bold}>{e.ruc}</Text></Text>
            <Text style={[s.bold, { fontSize: 12, marginTop: 4, textAlign: "center" }]}>{nombreComprobante(f.tipoComprobante).toUpperCase()}</Text>
            <Text style={[s.bold, { fontSize: 11 }]}>N° {f.numero}</Text>
          </View>
        </View>

        {/* Datos del cliente */}
        <View style={[s.box, { marginTop: 8, gap: 3 }]}>
          <View style={s.row}>
            <Text style={{ flex: 1 }}>Fecha de emisión: <Text style={s.bold}>{formatFecha(f.fecha)}</Text></Text>
            <Text style={{ flex: 1 }}>Condición de venta: <Text style={s.bold}>{f.condicion === "CONTADO" ? "Contado" : "Crédito"}</Text></Text>
          </View>
          <View style={s.row}>
            <Text style={{ flex: 1 }}>Nombre o razón social: <Text style={s.bold}>{f.cliente.nombre}</Text></Text>
            <Text style={{ flex: 1 }}>RUC / CI: <Text style={s.bold}>{f.cliente.ruc ?? "—"}</Text></Text>
          </View>
          {f.cliente.direccion && <Text>Dirección: {f.cliente.direccion}</Text>}
        </View>

        {/* Detalle */}
        <View style={[s.box, { marginTop: 8, padding: 0 }]}>
          <View style={s.row}>
            {cols.map((c, i) => (
              <Text key={c.key} style={[s.th, { width: c.w }, i !== 1 ? s.right : {}]}>{c.label}</Text>
            ))}
          </View>
          {f.lineas.map((l) => {
            const sub = gs(l.subtotal);
            const vals = [formatQty(l.cantidad), l.descripcion, gs(l.precioUnitario),
              toNum(l.descuento) > 0 ? gs(l.descuento) : "",
              l.tasaIva === 0 ? sub : "", l.tasaIva === 5 ? sub : "", l.tasaIva === 10 ? sub : ""];
            return (
              <View key={l.id} style={s.row} wrap={false}>
                {vals.map((v, i) => (
                  <Text key={i} style={[s.td, { width: cols[i].w }, i !== 1 ? s.right : {}]}>{v}</Text>
                ))}
              </View>
            );
          })}
          <View style={s.row}>
            <Text style={[s.td, s.bold, { width: "64%" }]}>Subtotales</Text>
            <Text style={[s.td, s.right, { width: "12%" }]}>{gs(f.exenta)}</Text>
            <Text style={[s.td, s.right, { width: "12%" }]}>{gs(f.gravada5)}</Text>
            <Text style={[s.td, s.right, { width: "12%" }]}>{gs(f.gravada10)}</Text>
          </View>
          <View style={[s.row, { padding: 4 }]}>
            <Text style={[s.bold, { flex: 1, fontSize: 10 }]}>TOTAL A PAGAR: Gs. {gs(f.total)}</Text>
          </View>
          <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
            <Text style={s.muted}>Son guaraníes: {numeroALetras(toNum(f.total))}.</Text>
          </View>
          <View style={[s.row, { padding: 4, borderTop: "0.5pt solid #ccc" }]}>
            <Text style={{ flex: 1 }}>Liquidación del IVA:</Text>
            <Text style={{ flex: 1 }}>(5%) {gs(f.iva5)}</Text>
            <Text style={{ flex: 1 }}>(10%) {gs(f.iva10)}</Text>
            <Text style={[{ flex: 1 }, s.bold]}>Total IVA: {gs(toNum(f.iva5) + toNum(f.iva10))}</Text>
          </View>
        </View>

        {f.observacion && <Text style={{ marginTop: 8 }}>Obs.: {f.observacion}</Text>}
        <Text style={[s.muted, { marginTop: 12, fontSize: 7 }]}>Original: Cliente · Duplicado: Archivo tributario</Text>
      </Page>
    </Document>
  );
}
