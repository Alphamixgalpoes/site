"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { PDFRelatorio } from "./consulta/PDFRelatorio";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false, loading: () => <button className="bg-gray-200 text-gray-400 px-4 py-2 text-sm cursor-not-allowed">PDF...</button> }
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
  galpao_imagens: { storage_path: string; ordem: number }[];
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const tipoLabel = (t: string) => t === "venda" ? "Venda" : t === "locacao" ? "Locação" : "V/L";

export default function ImoveisPage() {
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [maisAberto, setMaisAberto] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  // Filtros
  const [tipo, setTipo] = useState("todos");
  const [cidade, setCidade] = useState("todas");
  const [areaMin, setAreaMin] = useState("");
  const [areaMax, setAreaMax] = useState("");
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [docasMin, setDocasMin] = useState("");
  const [soPublicados, setSoPublicados] = useState(false);
  const [comCarreta, setComCarreta] = useState(false);
  const [comSprinkler, setComSprinkler] = useState(false);
  const [comGuarita, setComGuarita] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("galpoes")
      .select(`id, titulo, tipo, valor, cidade, bairro, endereco, publicado,
        area_construida_m2, area_total_m2, pe_direito_m, numero_docas,
        acesso_carreta, sprinklers, guarita, potencia_eletrica_kva,
        vagas_estacionamento, descricao,
        galpao_imagens (storage_path, ordem)`)
      .order("created_at", { ascending: false });
    setGalpoes(data ?? []);
    setLoading(false);
  }

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

  const stats = useMemo(() => ({
    total: galpoes.length,
    publicados: galpoes.filter((g) => g.publicado).length,
    ocultos: galpoes.filter((g) => !g.publicado).length,
  }), [galpoes]);

  const filtrosAtivos = useMemo(() => {
    const f: Record<string, string> = {};
    if (tipo !== "todos") f["Tipo"] = tipo === "venda" ? "Venda" : tipo === "locacao" ? "Locação" : "Venda/Locação";
    if (cidade !== "todas") f["Cidade"] = cidade;
    if (areaMin) f["Área mín."] = `${areaMin} m²`;
    if (areaMax) f["Área máx."] = `${areaMax} m²`;
    if (valorMin) f["Valor mín."] = `R$ ${Number(valorMin).toLocaleString("pt-BR")}`;
    if (valorMax) f["Valor máx."] = `R$ ${Number(valorMax).toLocaleString("pt-BR")}`;
    if (docasMin) f["Docas mín."] = docasMin;
    if (soPublicados) f["Status"] = "Somente publicados";
    if (comCarreta) f["Acesso carreta"] = "Sim";
    if (comSprinkler) f["Sprinklers"] = "Sim";
    if (comGuarita) f["Guarita"] = "Sim";
    return f;
  }, [tipo, cidade, areaMin, areaMax, valorMin, valorMax, docasMin, soPublicados, comCarreta, comSprinkler, comGuarita]);

  const temFiltro = Object.keys(filtrosAtivos).length > 0;

  function limpar() {
    setTipo("todos"); setCidade("todas"); setAreaMin(""); setAreaMax("");
    setValorMin(""); setValorMax(""); setDocasMin("");
    setSoPublicados(false); setComCarreta(false); setComSprinkler(false); setComGuarita(false);
  }

  async function togglePublicado(id: string, atual: boolean) {
    setGalpoes((prev) => prev.map((g) => g.id === id ? { ...g, publicado: !atual } : g));
    const supabase = createClient();
    await supabase.from("galpoes").update({ publicado: !atual }).eq("id", id);
  }

  async function excluir(id: string) {
    const supabase = createClient();
    await supabase.from("galpoes").delete().eq("id", id);
    setGalpoes((prev) => prev.filter((g) => g.id !== id));
    setDeletingId(null);
  }

  const sel = inputCls();

  return (
    <div className="space-y-5">

      {/* Topo */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Imóveis</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {stats.total} total · {stats.publicados} publicados · {stats.ocultos} ocultos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PDFDownloadLink
            document={<PDFRelatorio galpoes={filtrados} filtros={filtrosAtivos} supabaseUrl={supabaseUrl} />}
            fileName={`petrus-imoveis-${new Date().toISOString().slice(0, 10)}.pdf`}
          >
            {({ loading: l }) => (
              <button
                disabled={l || filtrados.length === 0}
                className="border border-gray-300 text-gray-600 px-4 py-2 text-sm hover:border-gray-500 transition-colors disabled:opacity-40"
              >
                {l ? "Gerando..." : `PDF (${filtrados.length})`}
              </button>
            )}
          </PDFDownloadLink>
          <Link
            href="/admin/galpoes/novo"
            className="bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            + Novo Galpão
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setFiltrosAbertos((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span className="flex flex-col gap-0.5 w-4">
              <span className="block h-px bg-current w-full" />
              <span className="block h-px bg-current w-3/4" />
              <span className="block h-px bg-current w-1/2" />
            </span>
            Filtros
            {temFiltro && (
              <span className="bg-gray-900 text-white text-xs px-1.5 py-0.5 font-medium">
                {Object.keys(filtrosAtivos).length}
              </span>
            )}
          </button>
          {temFiltro && (
            <button onClick={limpar} className="text-xs text-gray-400 hover:text-gray-900 transition-colors">
              Limpar filtros
            </button>
          )}
        </div>

        {filtrosAbertos && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Tipo</label>
                <select className={sel} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option value="todos">Todos</option>
                  <option value="locacao">Locação</option>
                  <option value="venda">Venda</option>
                  <option value="venda_locacao">Venda / Locação</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Cidade</label>
                <select className={sel} value={cidade} onChange={(e) => setCidade(e.target.value)}>
                  <option value="todas">Todas</option>
                  {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Área m²</label>
                <div className="flex gap-1">
                  <input type="number" placeholder="Mín" className={`${sel} w-20`} value={areaMin} onChange={(e) => setAreaMin(e.target.value)} />
                  <input type="number" placeholder="Máx" className={`${sel} w-20`} value={areaMax} onChange={(e) => setAreaMax(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Valor R$</label>
                <div className="flex gap-1">
                  <input type="number" placeholder="Mín" className={`${sel} w-24`} value={valorMin} onChange={(e) => setValorMin(e.target.value)} />
                  <input type="number" placeholder="Máx" className={`${sel} w-24`} value={valorMax} onChange={(e) => setValorMax(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Docas mín.</label>
                <input type="number" min="0" className={`${sel} w-16`} value={docasMin} onChange={(e) => setDocasMin(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap gap-5 pt-2 border-t border-gray-100">
              {[
                { label: "Acesso carreta", value: comCarreta, set: setComCarreta },
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
          </div>
        )}
      </div>

      {/* Contagem filtrada */}
      {temFiltro && (
        <p className="text-xs text-gray-400">
          {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""} com os filtros aplicados
        </p>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center">Nenhum galpão encontrado.</div>
      ) : (
        <div className="bg-white border border-gray-200 divide-y divide-gray-100">
          {filtrados.map((g) => {
            const imgs = [...g.galpao_imagens].sort((a, b) => a.ordem - b.ordem);
            const capa = imgs[0];

            return (
              <div key={g.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">

                {/* Thumbnail */}
                <div className="w-16 h-12 bg-gray-100 shrink-0 overflow-hidden">
                  {capa ? (
                    <img src={`${supabaseUrl}/storage/v1/object/public/galpoes/${capa.storage_path}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">—</div>
                  )}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{g.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[g.bairro, g.cidade].filter(Boolean).join(", ")}
                  </p>
                </div>

                {/* Badges de dados */}
                <div className="hidden md:flex items-center gap-4 text-xs text-gray-500 shrink-0">
                  <span className="w-20 text-center">{tipoLabel(g.tipo)}</span>
                  <span className="w-20 text-right">{g.area_construida_m2 ? `${g.area_construida_m2} m²` : "—"}</span>
                  <span className="w-24 text-right">{g.valor ? `R$ ${Number(g.valor).toLocaleString("pt-BR")}` : "—"}</span>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <button
                    onClick={() => togglePublicado(g.id, g.publicado)}
                    className={`text-xs px-3 py-1 font-medium transition-colors min-w-[80px] text-center ${
                      g.publicado ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {g.publicado ? "Publicado" : "Oculto"}
                  </button>

                  <Link href={`/admin/galpoes/${g.id}`} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
                    Editar
                  </Link>

                  {deletingId === g.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => excluir(g.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Confirmar</button>
                      <button onClick={() => setDeletingId(null)} className="text-xs text-gray-400 hover:text-gray-700">Cancelar</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeletingId(g.id)} className="text-xs text-gray-300 hover:text-red-500 transition-colors">
                      Excluir
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function inputCls() {
  return "border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-gray-900 bg-white";
}
