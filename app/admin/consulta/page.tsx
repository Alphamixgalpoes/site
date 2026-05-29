"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase-browser";
import { PDFRelatorio } from "./PDFRelatorio";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false, loading: () => <button className="bg-gray-200 text-gray-400 px-5 py-2 text-sm cursor-not-allowed">Carregando PDF...</button> }
);

type Galpao = {
  id: string;
  titulo: string;
  tipo: string;
  valor: number | null;
  cidade: string;
  bairro: string | null;
  endereco: string | null;
  publicado: boolean;
  area_construida_m2: number | null;
  area_total_m2: number | null;
  pe_direito_m: number | null;
  numero_docas: number;
  acesso_carreta: boolean;
  sprinklers: boolean;
  guarita: boolean;
  potencia_eletrica_kva: number | null;
  vagas_estacionamento: number;
  descricao: string | null;
  latitude: number | null;
  longitude: number | null;
  galpao_imagens: { storage_path: string; ordem: number }[];
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export default function ConsultaPage() {
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [tipo, setTipo] = useState("todos");
  const [cidade, setCidade] = useState("todas");
  const [areaMin, setAreaMin] = useState("");
  const [areaMax, setAreaMax] = useState("");
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [soPublicados, setSoPublicados] = useState(false);
  const [comCarreta, setComCarreta] = useState(false);
  const [comSprinkler, setComSprinkler] = useState(false);
  const [comGuarita, setComGuarita] = useState(false);
  const [docasMin, setDocasMin] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("galpoes")
        .select(`id, titulo, tipo, valor, cidade, bairro, endereco, publicado,
          area_construida_m2, area_total_m2, pe_direito_m, numero_docas,
          acesso_carreta, sprinklers, guarita, potencia_eletrica_kva,
          vagas_estacionamento, descricao, latitude, longitude,
          galpao_imagens (storage_path, ordem)`)
        .order("created_at", { ascending: false });
      setGalpoes(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const cidades = useMemo(() => {
    const s = new Set(galpoes.map((g) => g.cidade).filter(Boolean));
    return Array.from(s).sort();
  }, [galpoes]);

  const filtrados = useMemo(() => {
    return galpoes.filter((g) => {
      if (tipo !== "todos" && g.tipo !== tipo) return false;
      if (cidade !== "todas" && g.cidade !== cidade) return false;
      if (soPublicados && !g.publicado) return false;
      if (comCarreta && !g.acesso_carreta) return false;
      if (comSprinkler && !g.sprinklers) return false;
      if (comGuarita && !g.guarita) return false;
      if (areaMin && (g.area_construida_m2 ?? 0) < Number(areaMin)) return false;
      if (areaMax && (g.area_construida_m2 ?? 0) > Number(areaMax)) return false;
      if (valorMin && (g.valor ?? 0) < Number(valorMin)) return false;
      if (valorMax && (g.valor ?? 0) > Number(valorMax)) return false;
      if (docasMin && (g.numero_docas ?? 0) < Number(docasMin)) return false;
      return true;
    });
  }, [galpoes, tipo, cidade, soPublicados, comCarreta, comSprinkler, comGuarita, areaMin, areaMax, valorMin, valorMax, docasMin]);

  const filtrosParaPDF: Record<string, string> = {
    ...(tipo !== "todos" && { Tipo: tipo === "venda" ? "Venda" : tipo === "locacao" ? "Locação" : "Venda / Locação" }),
    ...(cidade !== "todas" && { Cidade: cidade }),
    ...(areaMin && { "Área mín.": `${areaMin} m²` }),
    ...(areaMax && { "Área máx.": `${areaMax} m²` }),
    ...(valorMin && { "Valor mín.": `R$ ${Number(valorMin).toLocaleString("pt-BR")}` }),
    ...(valorMax && { "Valor máx.": `R$ ${Number(valorMax).toLocaleString("pt-BR")}` }),
    ...(docasMin && { "Docas mín.": docasMin }),
    ...(soPublicados && { Status: "Somente publicados" }),
    ...(comCarreta && { "Acesso carreta": "Sim" }),
    ...(comSprinkler && { Sprinklers: "Sim" }),
    ...(comGuarita && { Guarita: "Sim" }),
  };

  const inputClass = "w-full border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-gray-900";
  const selectClass = inputClass;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Consulta</h1>
          <p className="text-sm text-gray-400 mt-0.5">{filtrados.length} galpão{filtrados.length !== 1 ? "s" : ""} encontrado{filtrados.length !== 1 ? "s" : ""}</p>
        </div>
        <PDFDownloadLink
          document={<PDFRelatorio galpoes={filtrados} filtros={filtrosParaPDF} supabaseUrl={supabaseUrl} baseUrl={typeof window !== "undefined" ? window.location.origin : ""} />}
          fileName={`alphamix-galpoes-consulta-${new Date().toISOString().slice(0, 10)}.pdf`}
        >
          {({ loading: pdfLoading }) => (
            <button
              className="bg-gray-900 text-white px-5 py-2 text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
              disabled={pdfLoading || filtrados.length === 0}
            >
              {pdfLoading ? "Gerando..." : `Gerar PDF (${filtrados.length})`}
            </button>
          )}
        </PDFDownloadLink>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Painel de filtros */}
        <aside className="w-full md:w-64 shrink-0 space-y-6">
          <div className="bg-white border border-gray-200 p-5 space-y-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filtros</p>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select className={selectClass} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="locacao">Locação</option>
                <option value="venda">Venda</option>
                <option value="venda_locacao">Venda / Locação</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
              <select className={selectClass} value={cidade} onChange={(e) => setCidade(e.target.value)}>
                <option value="todas">Todas</option>
                {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Área construída (m²)</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Mín" className={inputClass} value={areaMin} onChange={(e) => setAreaMin(e.target.value)} />
                <input type="number" placeholder="Máx" className={inputClass} value={areaMax} onChange={(e) => setAreaMax(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$)</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Mín" className={inputClass} value={valorMin} onChange={(e) => setValorMin(e.target.value)} />
                <input type="number" placeholder="Máx" className={inputClass} value={valorMax} onChange={(e) => setValorMax(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Docas mínimas</label>
              <input type="number" min="0" className={inputClass} value={docasMin} onChange={(e) => setDocasMin(e.target.value)} />
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-gray-600">Características</p>
              {[
                { label: "Acesso para carreta", value: comCarreta, set: setComCarreta },
                { label: "Sprinklers", value: comSprinkler, set: setComSprinkler },
                { label: "Guarita", value: comGuarita, set: setComGuarita },
                { label: "Somente publicados", value: soPublicados, set: setSoPublicados },
              ].map(({ label, value, set }) => (
                <label key={label} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} className="w-4 h-4" />
                  {label}
                </label>
              ))}
            </div>

            <button
              onClick={() => { setTipo("todos"); setCidade("todas"); setAreaMin(""); setAreaMax(""); setValorMin(""); setValorMax(""); setDocasMin(""); setSoPublicados(false); setComCarreta(false); setComSprinkler(false); setComGuarita(false); }}
              className="w-full text-xs text-gray-400 hover:text-gray-900 transition-colors text-center py-1"
            >
              Limpar filtros
            </button>
          </div>
        </aside>

        {/* Resultados */}
        <div className="flex-1">
          {loading ? (
            <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div className="text-sm text-gray-400 py-12 text-center">Nenhum galpão encontrado.</div>
          ) : (
            <div className="space-y-3">
              {filtrados.map((g) => {
                const imgs = [...g.galpao_imagens].sort((a, b) => a.ordem - b.ordem);
                const capa = imgs[0];
                return (
                  <div key={g.id} className="bg-white border border-gray-200 flex overflow-hidden">
                    <div className="w-32 h-24 bg-gray-100 shrink-0">
                      {capa ? (
                        <img src={`${supabaseUrl}/storage/v1/object/public/galpoes/${capa.storage_path}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Sem foto</div>
                      )}
                    </div>
                    <div className="flex-1 px-4 py-3 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm font-medium text-gray-900 truncate">{g.titulo}</p>
                        <span className={`text-xs px-2 py-0.5 shrink-0 ${g.publicado ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {g.publicado ? "Publicado" : "Oculto"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{[g.bairro, g.cidade].filter(Boolean).join(", ")}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        <span>{g.tipo === "venda" ? "Venda" : g.tipo === "locacao" ? "Locação" : "Venda/Loc."}</span>
                        {g.valor && <span>R$ {Number(g.valor).toLocaleString("pt-BR")}</span>}
                        {g.area_construida_m2 && <span>{g.area_construida_m2} m²</span>}
                        {g.pe_direito_m && <span>Pé {g.pe_direito_m}m</span>}
                        {g.numero_docas > 0 && <span>{g.numero_docas} docas</span>}
                        {g.acesso_carreta && <span>Carreta</span>}
                        {g.sprinklers && <span>Sprinkler</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
