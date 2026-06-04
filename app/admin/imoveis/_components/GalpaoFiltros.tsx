"use client";

import { useState } from "react";

type Props = {
  filtroCategoria: string; setFiltroCategoria: (v: string) => void;
  tipo: string; setTipo: (v: string) => void;
  cidade: string; setCidade: (v: string) => void;
  cidades: string[];
  areaMin: string; setAreaMin: (v: string) => void;
  areaMax: string; setAreaMax: (v: string) => void;
  valorMin: string; setValorMin: (v: string) => void;
  valorMax: string; setValorMax: (v: string) => void;
  docasMin: string; setDocasMin: (v: string) => void;
  soPublicados: boolean; setSoPublicados: (v: boolean) => void;
  comCarreta: boolean; setComCarreta: (v: boolean) => void;
  comSprinkler: boolean; setComSprinkler: (v: boolean) => void;
  comGuarita: boolean; setComGuarita: (v: boolean) => void;
  temFiltro: boolean;
  filtrosAtivos: Record<string, string>;
  limpar: () => void;
};

const sel = "border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-gray-900 bg-white";

export default function GalpaoFiltros({
  filtroCategoria, setFiltroCategoria,
  tipo, setTipo, cidade, setCidade, cidades,
  areaMin, setAreaMin, areaMax, setAreaMax,
  valorMin, setValorMin, valorMax, setValorMax,
  docasMin, setDocasMin,
  soPublicados, setSoPublicados,
  comCarreta, setComCarreta,
  comSprinkler, setComSprinkler,
  comGuarita, setComGuarita,
  temFiltro, filtrosAtivos, limpar,
}: Props) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="bg-white border border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setAberto((v) => !v)}
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

      {aberto && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Categoria</label>
              <select className={sel} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="galpao">Galpão</option>
                <option value="loja">Loja</option>
                <option value="terreno">Terreno</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Negócio</label>
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
  );
}
