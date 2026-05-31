import { tipoLabel } from "@/lib/galpao-utils";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { paddingTop: 50, paddingBottom: 60, paddingHorizontal: 45, fontSize: 9, fontFamily: "Helvetica", color: "#111" },

  // Header
  header: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 12, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 48, height: 48 },
  headerTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#111" },
  headerSub: { fontSize: 8, color: "#6b7280", marginTop: 2 },
  headerRight: { fontSize: 8, color: "#6b7280", textAlign: "right", gap: 2 },

  // Filtros
  filtrosBox: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", padding: 10, marginBottom: 20 },
  filtrosTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 },
  filtrosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  filtroTag: { backgroundColor: "#e5e7eb", paddingHorizontal: 8, paddingVertical: 3, fontSize: 8, color: "#374151" },

  // Galpão card
  galpaoCard: { marginBottom: 24, borderWidth: 1, borderColor: "#e5e7eb" },
  galpaoImg: { width: "100%", height: 180, objectFit: "cover" },
  galpaoBody: { padding: 12 },
  galpaoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  galpaoTitulo: { fontSize: 11, fontFamily: "Helvetica-Bold", flex: 1 },
  galpaoTipo: { fontSize: 8, color: "#6b7280", backgroundColor: "#f3f4f6", paddingHorizontal: 6, paddingVertical: 2 },
  galpaoLocal: { fontSize: 8, color: "#6b7280", marginBottom: 8 },
  galpaoValor: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111", marginBottom: 10 },

  fichaTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  fichaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  fichaItem: { width: "48%", flexDirection: "row", gap: 4 },
  fichaLabel: { fontSize: 7.5, color: "#9ca3af", width: 90 },
  fichaValue: { fontSize: 7.5, color: "#111", flex: 1 },

  descTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 10, marginBottom: 4 },
  descText: { fontSize: 8, color: "#4b5563", lineHeight: 1.5 },

  // Footer
  footer: { position: "absolute", bottom: 30, left: 45, right: 45, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: "#9ca3af" },

  pageNum: { fontSize: 7, color: "#9ca3af" },
  semResultados: { textAlign: "center", color: "#9ca3af", marginTop: 40 },

  // Mapa
  mapaBox: { marginBottom: 24, borderWidth: 1, borderColor: "#e5e7eb" },
  mapaTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#374151", textTransform: "uppercase", letterSpacing: 0.8, padding: 10, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  mapaImg: { width: "100%", height: 250, objectFit: "cover" },
  mapaLegenda: { flexDirection: "row", gap: 16, padding: 8, backgroundColor: "#f9fafb" },
  mapaLegendaText: { fontSize: 7, color: "#6b7280" },
});

import type { Galpao } from "@/lib/types";


function buildMapUrl(galpoes: Galpao[], baseUrl: string): string | null {
  const comCoordenadas = galpoes.filter((g) => g.latitude && g.longitude);
  if (comCoordenadas.length === 0) return null;

  const lats = comCoordenadas.map((g) => g.latitude as number);
  const lngs = comCoordenadas.map((g) => g.longitude as number);
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

  const markers = comCoordenadas
    .map((g) => `${g.latitude},${g.longitude},ol-marker`)
    .join("|");

  const params = new URLSearchParams({
    center: `${centerLat},${centerLng}`,
    zoom: "13",
    size: "600x250",
    markers,
  });

  return `${baseUrl}/api/staticmap?${params}`;
}

type Filtros = Record<string, string>;

export function PDFRelatorio({
  galpoes,
  filtros,
  supabaseUrl,
  baseUrl,
}: {
  galpoes: Galpao[];
  filtros: Filtros;
  supabaseUrl: string;
  baseUrl: string;
}) {
  const agora = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const filtrosAtivos = Object.entries(filtros).filter(([, v]) => v && v !== "todos" && v !== "");

  return (
    <Document title="Relatório de Galpões — Alphamix Galpões">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Image src={`${baseUrl}/alphamix-logo.png`} style={styles.headerLogo} />
            <View>
              <Text style={styles.headerTitle}>Alphamix Galpões</Text>
              <Text style={styles.headerSub}>Galpões Industriais · Alphaville e Barueri</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text>CRECI-SP 000000-F</Text>
            <Text>(11) 99557-1212</Text>
            <Text>Emitido em {agora}</Text>
          </View>
        </View>

        {/* Filtros aplicados */}
        {filtrosAtivos.length > 0 && (
          <View style={styles.filtrosBox}>
            <Text style={styles.filtrosTitle}>Filtros aplicados</Text>
            <View style={styles.filtrosGrid}>
              {filtrosAtivos.map(([k, v]) => (
                <View key={k} style={styles.filtroTag}>
                  <Text>{k}: {v}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Mapa de localização */}
        {(() => {
          const mapUrl = buildMapUrl(galpoes, baseUrl);
          if (!mapUrl) return null;
          const comCoordenadas = galpoes.filter((g) => g.latitude && g.longitude).length;
          return (
            <View style={styles.mapaBox}>
              <Text style={styles.mapaTitle}>Localização dos imóveis</Text>
              <Image src={mapUrl} style={styles.mapaImg} />
              <View style={styles.mapaLegenda}>
                <Text style={styles.mapaLegendaText}>
                  {comCoordenadas} imóvel(is) com localização disponível · © OpenStreetMap contributors
                </Text>
              </View>
            </View>
          );
        })()}

        {/* Resultados */}
        {galpoes.length === 0 ? (
          <Text style={styles.semResultados}>Nenhum galpão encontrado com os filtros selecionados.</Text>
        ) : (
          galpoes.map((g) => {
            const imgs = [...g.galpao_imagens].sort((a, b) => a.ordem - b.ordem);
            const capa = imgs.find((i) => i.is_capa) ?? imgs[0];
            const imgUrl = capa ? `${supabaseUrl}/storage/v1/object/public/galpoes/${capa.storage_path}` : null;

            const ficha = [
              { label: "Área construída", value: g.area_construida_m2 ? `${g.area_construida_m2} m²` : null },
              { label: "Área total", value: g.area_total_m2 ? `${g.area_total_m2} m²` : null },
              { label: "Pé direito livre", value: g.pe_direito_m ? `${g.pe_direito_m} m` : null },
              { label: "Docas", value: g.numero_docas > 0 ? `${g.numero_docas}` : null },
              { label: "Potência elétrica", value: g.potencia_eletrica_kva ? `${g.potencia_eletrica_kva} kVA` : null },
              { label: "Vagas", value: g.vagas_estacionamento > 0 ? `${g.vagas_estacionamento}` : null },
              { label: "Acesso carreta", value: g.acesso_carreta ? "Sim" : null },
              { label: "Sprinklers", value: g.sprinklers ? "Sim" : null },
              { label: "Guarita", value: g.guarita ? "Sim" : null },
            ].filter((i) => i.value);

            return (
              <View key={g.id} style={styles.galpaoCard} wrap={false}>
                {imgUrl && <Image src={imgUrl} style={styles.galpaoImg} />}
                <View style={styles.galpaoBody}>
                  <View style={styles.galpaoHeader}>
                    <Text style={styles.galpaoTitulo}>{g.titulo}</Text>
                    <Text style={styles.galpaoTipo}>{tipoLabel(g.tipo)}</Text>
                  </View>
                  <Text style={styles.galpaoLocal}>
                    {[g.endereco, g.bairro, g.cidade].filter(Boolean).join(" · ")}
                  </Text>
                  {g.valor && (
                    <Text style={styles.galpaoValor}>
                      R$ {Number(g.valor).toLocaleString("pt-BR")}
                      {g.tipo === "locacao" ? "/mês" : ""}
                    </Text>
                  )}

                  {ficha.length > 0 && (
                    <>
                      <Text style={styles.fichaTitle}>Ficha Técnica</Text>
                      <View style={styles.fichaGrid}>
                        {ficha.map((item) => (
                          <View key={item.label} style={styles.fichaItem}>
                            <Text style={styles.fichaLabel}>{item.label}</Text>
                            <Text style={styles.fichaValue}>{item.value}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {g.descricao && (
                    <>
                      <Text style={styles.descTitle}>Descrição</Text>
                      <Text style={styles.descText}>{g.descricao}</Text>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Documento emitido por Alphamix Galpões · CRECI-SP 000000-F · Uso restrito · Não reproduzir sem autorização
          </Text>
          <Text style={styles.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
