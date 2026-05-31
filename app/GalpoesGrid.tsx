"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { campoVisivel, type ConfigCampo, type OverridesVisibilidade } from "@/lib/visibilidade";
import { tipoLabel } from "@/lib/galpao-utils";

import type { GalpaoPublico as Galpao } from "@/lib/types";


type Categoria = "galpao" | "loja" | "terreno";
type Negocio = "todos" | "venda" | "locacao";
type UsoTerreno = "todos" | "galpao" | "loja" | "ambos";

type Props = {
  galpoes: Galpao[];
  supabaseUrl: string;
  configCampos?: ConfigCampo[];
  initialCategoria?: Categoria;
  initialNegocio?: Negocio;
  initialCidade?: string;
  excludeId?: string;
};

const btnToggle = (active: boolean) =>
  `px-3 py-1.5 text-xs font-semibold rounded-sm border transition-colors ${
    active
      ? "bg-[#2e3092] text-white border-[#2e3092]"
      : "border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-800 bg-white"
  }`;

const inputCls =
  "border border-gray-200 px-3 py-2 text-sm text-gray-900 rounded-sm focus:outline-none focus:border-[#2e3092] bg-white w-full transition-colors";

export default function GalpoesGrid({
  galpoes,
  supabaseUrl,
  configCampos = [],
  initialCategoria,
  initialNegocio,
  initialCidade,
  excludeId,
}: Props) {
  const [categoria, setCategoria] = useState<Categoria>(initialCategoria ?? "galpao");
  const [negocio, setNegocio] = useState<Negocio>(initialNegocio ?? "todos");
  const [cidade, setCidade] = useState(initialCidade ?? "todas");
  const [areaMin, setAreaMin] = useState("");
  const [areaMax, setAreaMax] = useState("");
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [peMin, setPeMin] = useState("");
  const [docasMin, setDocasMin] = useState("");
  const [acessoCarreta, setAcessoCarreta] = useState(false);
  const [vagasMin, setVagasMin] = useState("");
  const [usoTerreno, setUsoTerreno] = useState<UsoTerreno>("todos");

  function resetFiltros() {
    setNegocio("todos"); setCidade("todas");
    setAreaMin(""); setAreaMax(""); setValorMin(""); setValorMax("");
    setPeMin(""); setDocasMin(""); setAcessoCarreta(false);
    setVagasMin(""); setUsoTerreno("todos");
  }

  function mudarCategoria(cat: Categoria) {
    setCategoria(cat);
    resetFiltros();
  }

  const porCategoria = useMemo(() => ({
    galpao: galpoes.filter((g) => g.categoria === "galpao" && g.id !== excludeId),
    loja:   galpoes.filter((g) => g.categoria === "loja"   && g.id !== excludeId),
    terreno: galpoes.filter((g) => g.categoria === "terreno" && g.id !== excludeId),
  }), [galpoes, excludeId]);

  const cidades = useMemo(() => {
    const s = new Set(porCategoria[categoria].map((g) => g.cidade).filter(Boolean));
    return Array.from(s).sort();
  }, [porCategoria, categoria]);

  const filtrosAtivos = useMemo(() => {
    let n = 0;
    if (negocio !== "todos") n++;
    if (cidade !== "todas") n++;
    if (areaMin || areaMax) n++;
    if (valorMin || valorMax) n++;
    if (peMin) n++;
    if (docasMin) n++;
    if (acessoCarreta) n++;
    if (vagasMin) n++;
    if (usoTerreno !== "todos") n++;
    return n;
  }, [negocio, cidade, areaMin, areaMax, valorMin, valorMax, peMin, docasMin, acessoCarreta, vagasMin, usoTerreno]);

  const filtrados = useMemo(() => {
    return porCategoria[categoria].filter((g) => {
      if (negocio === "venda"   && g.tipo !== "venda"   && g.tipo !== "venda_locacao") return false;
      if (negocio === "locacao" && g.tipo !== "locacao" && g.tipo !== "venda_locacao") return false;
      if (cidade !== "todas" && g.cidade !== cidade) return false;
      const areaRef = categoria === "terreno" ? (g.area_total_m2 ?? 0) : (g.area_construida_m2 ?? 0);
      if (areaMin && areaRef < Number(areaMin)) return false;
      if (areaMax && areaRef > Number(areaMax)) return false;
      if (valorMin && (g.valor ?? 0) < Number(valorMin)) return false;
      if (valorMax && (g.valor ?? 0) > Number(valorMax)) return false;
      if (categoria === "terreno" && usoTerreno !== "todos" && g.uso_terreno !== usoTerreno) return false;
      if (categoria === "galpao") {
        if (peMin    && (g.pe_direito_m  ?? 0) < Number(peMin))   return false;
        if (docasMin && (g.numero_docas  ?? 0) < Number(docasMin)) return false;
        if (acessoCarreta && !g.acesso_carreta) return false;
      }
      if (categoria === "loja" && vagasMin && (g.vagas_estacionamento ?? 0) < Number(vagasMin)) return false;
      return true;
    });
  }, [porCategoria, categoria, negocio, cidade, areaMin, areaMax, valorMin, valorMax, peMin, docasMin, acessoCarreta, vagasMin, usoTerreno]);

  return (
    <div>
      {/* Painel de filtros */}
      <div className="mt-8 border border-gray-200 rounded-sm bg-white shadow-sm">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filtros
            {filtrosAtivos > 0 && (
              <span className="bg-[#2e3092] text-white text-xs px-1.5 py-0.5 rounded-sm font-bold">
                {filtrosAtivos}
              </span>
            )}
          </span>
          {filtrosAtivos > 0 && (
            <button
              onClick={resetFiltros}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors font-medium"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Campos */}
        <div className="px-5 py-5 space-y-5">

          {/* Categoria */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Categoria</span>
            <div className="flex flex-wrap gap-2">
              {([
                { key: "galpao",  label: "Galpões"  },
                { key: "loja",    label: "Lojas"     },
                { key: "terreno", label: "Terrenos"  },
              ] as { key: Categoria; label: string }[]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => mudarCategoria(t.key)}
                  className={btnToggle(categoria === t.key)}
                >
                  {t.label}
                  <span className={`ml-1.5 text-xs ${categoria === t.key ? "text-white/60" : "text-gray-400"}`}>
                    {porCategoria[t.key].length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Negócio */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Negócio</span>
            <div className="flex flex-wrap gap-2">
              {(["todos", "venda", "locacao"] as Negocio[]).map((n) => (
                <button key={n} onClick={() => setNegocio(n)} className={btnToggle(negocio === n)}>
                  {n === "todos" ? "Todos" : n === "venda" ? "Venda" : "Locação"}
                </button>
              ))}
            </div>
          </div>

          {/* Uso do terreno */}
          {categoria === "terreno" && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Uso indicado</span>
              <div className="flex flex-wrap gap-2">
                {(["todos", "galpao", "loja", "ambos"] as UsoTerreno[]).map((u) => (
                  <button key={u} onClick={() => setUsoTerreno(u)} className={btnToggle(usoTerreno === u)}>
                    {u === "todos" ? "Todos" : u === "galpao" ? "Galpão" : u === "loja" ? "Loja" : "Galpão e Loja"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inputs em grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cidade</label>
              <select className={inputCls} value={cidade} onChange={(e) => setCidade(e.target.value)}>
                <option value="todas">Todas</option>
                {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {categoria === "terreno" ? "Área total (m²)" : "Área construída (m²)"}
              </label>
              <div className="flex gap-2">
                <input type="number" placeholder="Mín" className={inputCls} value={areaMin} onChange={(e) => setAreaMin(e.target.value)} />
                <input type="number" placeholder="Máx" className={inputCls} value={areaMax} onChange={(e) => setAreaMax(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Valor (R$)</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Mín" className={inputCls} value={valorMin} onChange={(e) => setValorMin(e.target.value)} />
                <input type="number" placeholder="Máx" className={inputCls} value={valorMax} onChange={(e) => setValorMax(e.target.value)} />
              </div>
            </div>

            {categoria === "galpao" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pé direito mín. (m)</label>
                  <input type="number" step="0.5" placeholder="Ex: 8" className={inputCls} value={peMin} onChange={(e) => setPeMin(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Docas mín.</label>
                  <input type="number" min="0" placeholder="Ex: 2" className={inputCls} value={docasMin} onChange={(e) => setDocasMin(e.target.value)} />
                </div>
              </>
            )}

            {categoria === "loja" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Vagas mín.</label>
                <input type="number" min="0" placeholder="Ex: 5" className={inputCls} value={vagasMin} onChange={(e) => setVagasMin(e.target.value)} />
              </div>
            )}
          </div>

          {categoria === "galpao" && (
            <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={acessoCarreta}
                onChange={(e) => setAcessoCarreta(e.target.checked)}
                className="w-4 h-4 accent-[#2e3092]"
              />
              Acesso para carreta
            </label>
          )}
        </div>
      </div>

      {/* Contagem */}
      <p className="mt-4 text-xs text-gray-400 font-medium">
        {filtrados.length} imóvel{filtrados.length !== 1 ? "is" : ""} encontrado{filtrados.length !== 1 ? "s" : ""}
        {filtrosAtivos > 0 ? " com os filtros aplicados" : ""}
      </p>

      {/* Grid de cards */}
      {filtrados.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-gray-200 rounded-sm mt-6">
          <p className="text-sm text-gray-400">Nenhum imóvel disponível nesta categoria.</p>
        </div>
      ) : (
        <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrados.map((g) => {
            const imagens = [...g.galpao_imagens].sort((a, b) => a.ordem - b.ordem);
            const capa = imagens.find((i) => i.is_capa) ?? imagens[0];
            const tipoBg = g.tipo === "venda"
              ? "bg-[#2e3092] text-white"
              : g.tipo === "locacao"
              ? "bg-gray-900 text-white"
              : "bg-gray-700 text-white";

            const qs = new URLSearchParams({
              ...(categoria !== "galpao" ? { categoria } : {}),
              ...(negocio   !== "todos"  ? { negocio }   : {}),
              ...(cidade    !== "todas"  ? { cidade }     : {}),
            }).toString();
            const href = `/galpoes/${g.id}${qs ? `?${qs}` : ""}`;

            return (
              <Link
                key={g.id}
                href={href}
                className="group bg-white border border-gray-200 rounded-sm shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden flex flex-col"
              >
                {/* Imagem */}
                <div className="relative bg-gray-100 h-52 overflow-hidden shrink-0">
                  {capa ? (
                    <img
                      src={`${supabaseUrl}/storage/v1/object/public/galpoes/${capa.storage_path}`}
                      alt={g.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                      Sem foto
                    </div>
                  )}
                  <span className={`absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-sm ${tipoBg}`}>
                    {tipoLabel(g.tipo)}
                  </span>
                </div>

                {/* Conteúdo */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-sm font-bold text-gray-900 leading-snug">{g.titulo}</h3>
                  {campoVisivel("bairro", "card", configCampos, g.campos_visibilidade ?? {}) && (
                    <p className="text-xs text-gray-400 mt-1">
                      {g.bairro ? `${g.bairro}, ` : ""}{g.cidade}
                    </p>
                  )}

                  {g.valor && campoVisivel("valor", "card", configCampos, g.campos_visibilidade ?? {}) && (
                    <p className="text-lg font-bold text-gray-900 mt-3">
                      R$ {Number(g.valor).toLocaleString("pt-BR")}
                      {g.tipo === "locacao" && (
                        <span className="text-xs font-normal text-gray-400 ml-1">/mês</span>
                      )}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {g.categoria === "terreno" ? (
                      <>
                        {g.area_total_m2 && campoVisivel("area_total_m2", "card", configCampos, g.campos_visibilidade ?? {}) && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                            {g.area_total_m2.toLocaleString("pt-BR")} m²
                          </span>
                        )}
                        {g.uso_terreno && campoVisivel("uso_terreno", "card", configCampos, g.campos_visibilidade ?? {}) && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                            {g.uso_terreno === "galpao" ? "Para galpão" : g.uso_terreno === "loja" ? "Para loja" : "Galpão e loja"}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        {g.area_construida_m2 && campoVisivel("area_construida_m2", "card", configCampos, g.campos_visibilidade ?? {}) && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                            {g.area_construida_m2.toLocaleString("pt-BR")} m²
                          </span>
                        )}
                        {g.pe_direito_m && campoVisivel("pe_direito_m", "card", configCampos, g.campos_visibilidade ?? {}) && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                            Pé {g.pe_direito_m}m
                          </span>
                        )}
                        {g.numero_docas > 0 && campoVisivel("numero_docas", "card", configCampos, g.campos_visibilidade ?? {}) && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                            {g.numero_docas} doca{g.numero_docas > 1 ? "s" : ""}
                          </span>
                        )}
                        {g.acesso_carreta && g.categoria === "galpao" && campoVisivel("acesso_carreta", "card", configCampos, g.campos_visibilidade ?? {}) && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                            Acesso carreta
                          </span>
                        )}
                        {g.vagas_estacionamento > 0 && g.categoria === "loja" && campoVisivel("vagas_estacionamento", "card", configCampos, g.campos_visibilidade ?? {}) && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                            {g.vagas_estacionamento} vagas
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="mt-auto pt-4">
                    <span className="text-xs font-bold text-[#2e3092] group-hover:underline">
                      Ver detalhes →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
