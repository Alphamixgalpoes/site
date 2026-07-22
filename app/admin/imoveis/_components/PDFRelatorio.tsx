import { tipoLabel } from "@/lib/imovel-utils";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Imovel, ImovelImagem } from "@/lib/types";
import { API_BASE_URL } from "@/lib/api-client";
import type { ConfigCampo } from "@/lib/visibilidade";

export type OpcoesPDF = {
  sumario: boolean;
  fichas: boolean;
  fotosNaFicha: 1 | 3 | 5;
  galeria: boolean;
  incluirConfidenciais: boolean;
};

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  gray900: "#111827",
  gray700: "#374151",
  gray500: "#6b7280",
  gray400: "#9ca3af",
  gray200: "#e5e7eb",
  gray100: "#f3f4f6",
  gray50: "#f9fafb",
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 45,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: C.gray900,
  },

  // Header
  header: {
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
    paddingBottom: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 48, height: 48 },
  headerTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.gray900 },
  headerSub: { fontSize: 8, color: C.gray500, marginTop: 2 },
  headerRight: { fontSize: 8, color: C.gray500, textAlign: "right" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 45,
    right: 45,
    borderTopWidth: 1,
    borderTopColor: C.gray200,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: C.gray400 },
  pageNum: { fontSize: 7, color: C.gray400 },

  // Filtros
  filtrosBox: {
    backgroundColor: C.gray50,
    borderWidth: 1,
    borderColor: C.gray200,
    padding: 10,
    marginBottom: 16,
  },
  filtrosTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.gray700,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  filtrosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  filtroTag: {
    backgroundColor: C.gray200,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 8,
    color: C.gray700,
  },

  // Mapa
  mapaBox: { marginBottom: 14, borderWidth: 1, borderColor: C.gray200 },
  mapaTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.gray700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
  },
  mapaImg: { width: "100%", height: 260, objectFit: "cover" },
  mapaAtrib: {
    fontSize: 6.5,
    color: C.gray400,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
  },

  // Sumário — lista compacta
  listaTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.gray700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  listaItem: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: C.gray200,
    marginBottom: 4,
    overflow: "hidden",
  },
  listaThumb: { width: 65, height: 48, backgroundColor: C.gray100 },
  listaThumbImg: { width: 65, height: 48, objectFit: "cover" },
  listaCorpo: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: "center",
  },
  listaTitulo: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.gray900,
    marginBottom: 2,
  },
  listaSub: { fontSize: 7.5, color: C.gray500 },

  // Ficha — cabeçalho
  fichaCabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 6,
  },
  fichaNumLabel: { fontSize: 8, color: C.gray500, marginBottom: 1 },
  fichaTitulo: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.gray900 },
  fichaTipoBadge: {
    fontSize: 8,
    color: C.gray500,
    backgroundColor: C.gray100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fichaDivider: { borderBottomWidth: 1, borderBottomColor: C.gray900, marginBottom: 10 },
  fichaLocal: { fontSize: 8.5, color: C.gray500, marginBottom: 4 },
  fichaValor: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.gray900,
    marginBottom: 10,
  },

  // Ficha — fotos
  fichaHeroImg: { width: "100%", objectFit: "cover" },
  fichaSecRow: { flexDirection: "row", gap: 3 },
  fichaSecImg: { flex: 1, objectFit: "cover" },

  // Ficha — dados técnicos
  fichaSection: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.gray700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 5,
  },
  fichaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  fichaItem: { width: "48%", flexDirection: "row", gap: 4, marginBottom: 2 },
  fichaLabel: { fontSize: 7.5, color: C.gray400, width: 95 },
  fichaValue: { fontSize: 7.5, color: C.gray900, flex: 1 },
  fichaText: { fontSize: 8, color: "#4b5563", lineHeight: 1.5 },

  // Galeria
  galeriaTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.gray900,
    marginBottom: 2,
  },
  galeriaSub: { fontSize: 7.5, color: C.gray500, marginBottom: 8 },
  galeraRow: { flexDirection: "row", gap: 3, marginBottom: 3 },
  galeriaPhoto: { flex: 1, height: 130, objectFit: "cover" },
  galeriaPhotoEmpty: { flex: 1, height: 130, backgroundColor: C.gray50 },

  semResultados: { textAlign: "center", color: C.gray400, marginTop: 40 },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

type ImovelComNum = Imovel & { num: number };

function isCampoConfidencial(campoChave: string, configCampos: ConfigCampo[]): boolean {
  return configCampos.find((c) => c.campo_chave === campoChave)?.confidencial ?? false;
}

function fotosSite(imagens: ImovelImagem[]): ImovelImagem[] {
  return [...imagens].filter((i) => i.visivel_site).sort((a, b) => a.ordem - b.ordem);
}

function imgUrl(supabaseUrl: string, img: ImovelImagem): string {
  return `${supabaseUrl}/storage/v1/object/public/galpoes/${img.storage_path}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PdfHeader({ baseUrl, agora }: { baseUrl: string; agora: string }) {
  return (
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
  );
}

function PdfFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        Alphamix Galpões · CRECI-SP 000000-F · Uso restrito · Não reproduzir sem autorização
      </Text>
      <Text
        style={styles.pageNum}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function SecaoSumario({
  imoveis,
  filtros,
  supabaseUrl,
  baseUrl,
  incluirConfidenciais,
  configCampos,
}: {
  imoveis: ImovelComNum[];
  filtros: Record<string, string>;
  supabaseUrl: string;
  baseUrl: string;
  incluirConfidenciais: boolean;
  configCampos: ConfigCampo[];
}) {
  const filtrosAtivos = Object.entries(filtros).filter(([, v]) => v && v !== "todos" && v !== "");
  const comCoordenadas = imoveis.filter((g) => g.latitude && g.longitude);

  let mapaUrl: string | null = null;
  if (comCoordenadas.length > 0) {
    const markers = comCoordenadas
      .map((g) => `${g.latitude},${g.longitude},${g.num}`)
      .join("|");
    const params = new URLSearchParams({ size: "800x380", markers });
    mapaUrl = `${API_BASE_URL}/api/v1/maps/static?${params}`;
  }

  const mostrarValor = incluirConfidenciais || !isCampoConfidencial("valor", configCampos);

  return (
    <>
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

      {mapaUrl && (
        <View style={styles.mapaBox}>
          <Text style={styles.mapaTitle}>Localização dos imóveis</Text>
          <Image src={mapaUrl} style={styles.mapaImg} />
          <Text style={styles.mapaAtrib}>© OpenStreetMap contributors · © CARTO</Text>
        </View>
      )}

      {imoveis.length === 0 ? (
        <Text style={styles.semResultados}>
          Nenhum galpão encontrado com os filtros selecionados.
        </Text>
      ) : (
        <>
          <Text style={styles.listaTitle}>
            {imoveis.length} imóvel{imoveis.length !== 1 ? "s" : ""} encontrado
            {imoveis.length !== 1 ? "s" : ""}
          </Text>
          {imoveis.map((g) => {
            const fotos = fotosSite(g.imovel_imagens);
            const capa = fotos[0];

            const subParts = [
              tipoLabel(g.tipo),
              g.cidade,
              g.area_construida_m2 ? `${g.area_construida_m2} m²` : null,
              mostrarValor && g.valor
                ? `R$ ${Number(g.valor).toLocaleString("pt-BR")}${g.tipo === "locacao" ? "/mês" : ""}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <View key={g.id} style={styles.listaItem}>
                <View style={styles.listaThumb}>
                  {capa && (
                    <Image src={imgUrl(supabaseUrl, capa)} style={styles.listaThumbImg} />
                  )}
                </View>
                <View style={styles.listaCorpo}>
                  <Text style={styles.listaTitulo}>N°{g.num} · {g.titulo}</Text>
                  <Text style={styles.listaSub}>{subParts}</Text>
                </View>
              </View>
            );
          })}
        </>
      )}
    </>
  );
}

function FichaImovel({
  g,
  supabaseUrl,
  opcoes,
  configCampos,
}: {
  g: ImovelComNum;
  supabaseUrl: string;
  opcoes: OpcoesPDF;
  configCampos: ConfigCampo[];
}) {
  const visibleFotos = fotosSite(g.imovel_imagens).slice(0, opcoes.fotosNaFicha);
  const hero = visibleFotos[0];
  const secondary = visibleFotos.slice(1);

  const heroHeight = opcoes.fotosNaFicha === 1 ? 200 : opcoes.fotosNaFicha === 3 ? 160 : 130;
  const secHeight = opcoes.fotosNaFicha === 5 ? 80 : 90;

  const mostrar = (key: string) =>
    opcoes.incluirConfidenciais || !isCampoConfidencial(key, configCampos);

  // Secondary photos in pairs (for 2-col layout)
  const secPairs: ImovelImagem[][] = [];
  for (let i = 0; i < secondary.length; i += 2) {
    secPairs.push(secondary.slice(i, i + 2));
  }

  const fichaItems = [
    { key: "area_construida_m2", label: "Área construída", value: g.area_construida_m2 ? `${g.area_construida_m2} m²` : null },
    { key: "area_total_m2", label: "Área total", value: g.area_total_m2 ? `${g.area_total_m2} m²` : null },
    { key: "area_piso_m2", label: "Área de piso", value: g.area_piso_m2 ? `${g.area_piso_m2} m²` : null },
    { key: "pe_direito_m", label: "Pé direito livre", value: g.pe_direito_m ? `${g.pe_direito_m} m` : null },
    { key: "numero_docas", label: "Docas", value: g.numero_docas > 0 ? `${g.numero_docas}` : null },
    { key: "vagas_estacionamento", label: "Vagas", value: g.vagas_estacionamento > 0 ? `${g.vagas_estacionamento}` : null },
    { key: "truck_court_m", label: "Truck court", value: g.truck_court_m ? `${g.truck_court_m} m` : null },
    { key: "area_escritorio_m2", label: "Área escritório", value: g.area_escritorio_m2 ? `${g.area_escritorio_m2} m²` : null },
    { key: "potencia_eletrica_kva", label: "Potência elétrica", value: g.potencia_eletrica_kva ? `${g.potencia_eletrica_kva} kVA` : null },
    { key: "capacidade_piso_ton_m2", label: "Cap. piso", value: g.capacidade_piso_ton_m2 ? `${g.capacidade_piso_ton_m2} t/m²` : null },
    { key: "avcb_numero", label: "AVCB n°", value: g.avcb_numero ?? null },
    { key: "avcb_validade", label: "AVCB validade", value: g.avcb_validade ?? null },
    { key: "acesso_carreta", label: "Acesso carreta", value: g.acesso_carreta ? "Sim" : null },
    { key: "sprinklers", label: "Sprinklers", value: g.sprinklers ? (g.sprinkler_tipo ? `Sim — ${g.sprinkler_tipo}` : "Sim") : null },
    { key: "guarita", label: "Guarita", value: g.guarita ? "Sim" : null },
    { key: "condominio", label: "Condomínio", value: g.condominio ? "Sim" : null },
    { key: "valor_condominio", label: "Valor cond.", value: g.valor_condominio ? `R$ ${Number(g.valor_condominio).toLocaleString("pt-BR")}` : null },
    { key: "acessos_viarios", label: "Acessos viários", value: g.acessos_viarios ?? null },
  ].filter((f) => f.value !== null && mostrar(f.key));

  return (
    <View>
      {/* Cabeçalho */}
      <View style={styles.fichaCabecalho}>
        <View>
          <Text style={styles.fichaNumLabel}>N° {g.num}</Text>
          <Text style={styles.fichaTitulo}>{g.titulo}</Text>
        </View>
        <Text style={styles.fichaTipoBadge}>{tipoLabel(g.tipo)}</Text>
      </View>
      <View style={styles.fichaDivider} />

      {/* Local */}
      <Text style={styles.fichaLocal}>
        {[g.endereco, g.bairro, g.cidade].filter(Boolean).join(" · ")}
      </Text>

      {/* Valor */}
      {mostrar("valor") && g.valor && (
        <Text style={styles.fichaValor}>
          R$ {Number(g.valor).toLocaleString("pt-BR")}
          {g.tipo === "locacao" ? "/mês" : ""}
        </Text>
      )}

      {/* Foto principal */}
      {hero && (
        <Image
          src={imgUrl(supabaseUrl, hero)}
          style={[styles.fichaHeroImg, { height: heroHeight, marginBottom: secPairs.length > 0 ? 3 : 10 }]}
        />
      )}

      {/* Fotos secundárias em pares */}
      {secPairs.map((pair, idx) => (
        <View
          key={idx}
          style={[styles.fichaSecRow, { marginBottom: idx === secPairs.length - 1 ? 10 : 3 }]}
        >
          {pair.map((foto) => (
            <Image
              key={foto.storage_path}
              src={imgUrl(supabaseUrl, foto)}
              style={[styles.fichaSecImg, { height: secHeight }]}
            />
          ))}
        </View>
      ))}

      {/* Ficha técnica */}
      {fichaItems.length > 0 && (
        <>
          <Text style={styles.fichaSection}>Ficha Técnica</Text>
          <View style={styles.fichaGrid}>
            {fichaItems.map((item) => (
              <View key={item.key} style={styles.fichaItem}>
                <Text style={styles.fichaLabel}>{item.label}</Text>
                <Text style={styles.fichaValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Descrição */}
      {g.descricao && (
        <>
          <Text style={styles.fichaSection}>Descrição</Text>
          <Text style={styles.fichaText}>{g.descricao}</Text>
        </>
      )}

      {/* Observações */}
      {mostrar("observacoes") && g.observacoes && (
        <>
          <Text style={styles.fichaSection}>Observações</Text>
          <Text style={styles.fichaText}>{g.observacoes}</Text>
        </>
      )}
    </View>
  );
}

function GaleriaImovel({
  g,
  supabaseUrl,
}: {
  g: ImovelComNum;
  supabaseUrl: string;
}) {
  const fotos = fotosSite(g.imovel_imagens);

  const rows: ImovelImagem[][] = [];
  for (let i = 0; i < fotos.length; i += 3) {
    rows.push(fotos.slice(i, i + 3));
  }

  return (
    <View>
      <Text style={styles.galeriaTitle}>N°{g.num} · {g.titulo}</Text>
      <Text style={styles.galeriaSub}>
        Galeria · {[g.bairro, g.cidade].filter(Boolean).join(", ")} · {fotos.length} foto
        {fotos.length !== 1 ? "s" : ""}
      </Text>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.galeraRow}>
          {row.map((foto) => (
            <Image
              key={foto.storage_path}
              src={imgUrl(supabaseUrl, foto)}
              style={styles.galeriaPhoto}
            />
          ))}
          {row.length < 3 &&
            Array.from({ length: 3 - row.length }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.galeriaPhotoEmpty} />
            ))}
        </View>
      ))}
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function PDFRelatorio({
  imoveis,
  filtros,
  supabaseUrl,
  baseUrl,
  opcoes = { sumario: true, fichas: true, fotosNaFicha: 3, galeria: false, incluirConfidenciais: false },
  configCampos = [],
}: {
  imoveis: Imovel[];
  filtros: Record<string, string>;
  supabaseUrl: string;
  baseUrl: string;
  opcoes?: OpcoesPDF;
  configCampos?: ConfigCampo[];
}) {
  const agora = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const imoveisComNum: ImovelComNum[] = imoveis.map((g, i) => ({ ...g, num: i + 1 }));

  const imoveisComGaleria = opcoes.galeria
    ? imoveisComNum.filter((g) => fotosSite(g.imovel_imagens).length >= 2)
    : [];

  const nenhumaSelecionada = !opcoes.sumario && !opcoes.fichas && !opcoes.galeria;

  return (
    <Document title="Relatório de Galpões — Alphamix Galpões">
      {/* ── Sumário ── */}
      {opcoes.sumario && (
        <Page size="A4" style={styles.page}>
          <PdfHeader baseUrl={baseUrl} agora={agora} />
          <SecaoSumario
            imoveis={imoveisComNum}
            filtros={filtros}
            supabaseUrl={supabaseUrl}
            baseUrl={baseUrl}
            incluirConfidenciais={opcoes.incluirConfidenciais}
            configCampos={configCampos}
          />
          <PdfFooter />
        </Page>
      )}

      {/* ── Fichas detalhadas — 1 página por imóvel ── */}
      {opcoes.fichas &&
        imoveisComNum.map((g) => (
          <Page key={`ficha-${g.id}`} size="A4" style={styles.page}>
            <PdfHeader baseUrl={baseUrl} agora={agora} />
            <FichaImovel
              g={g}
              supabaseUrl={supabaseUrl}
              opcoes={opcoes}
              configCampos={configCampos}
            />
            <PdfFooter />
          </Page>
        ))}

      {/* ── Galeria completa ── */}
      {imoveisComGaleria.map((g) => (
        <Page key={`galeria-${g.id}`} size="A4" style={styles.page}>
          <PdfHeader baseUrl={baseUrl} agora={agora} />
          <GaleriaImovel g={g} supabaseUrl={supabaseUrl} />
          <PdfFooter />
        </Page>
      ))}

      {/* Fallback — nenhuma seção */}
      {nenhumaSelecionada && (
        <Page size="A4" style={styles.page}>
          <PdfHeader baseUrl={baseUrl} agora={agora} />
          <Text style={styles.semResultados}>Nenhuma seção selecionada.</Text>
          <PdfFooter />
        </Page>
      )}
    </Document>
  );
}
