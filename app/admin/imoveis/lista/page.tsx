"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useGalpoes } from "../_hooks/useGalpoes";
import type { Galpao } from "../_hooks/useGalpoes";
import GalpaoRow from "../_components/GalpaoRow";
import GalpaoFiltros from "../_components/GalpaoFiltros";
import GalpaoDetalheModal from "../_components/GalpaoDetalheModal";
import GalpaoPreviewModal from "../_components/GalpaoPreviewModal";
import { PDFRelatorio } from "../_components/PDFRelatorio";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false, loading: () => <button className="bg-gray-200 text-gray-400 px-4 py-2 text-sm cursor-not-allowed">PDF...</button> }
);

import { SUPABASE_URL } from "@/lib/constants";
const supabaseUrl = SUPABASE_URL;

export default function ImoveisListaPage() {
  const {
    loading, deletingId, setDeletingId, geocodingProgress,
    filtroCategoria, setFiltroCategoria,
    tipo, setTipo, cidade, setCidade, cidades,
    areaMin, setAreaMin, areaMax, setAreaMax,
    valorMin, setValorMin, valorMax, setValorMax,
    docasMin, setDocasMin,
    soPublicados, setSoPublicados,
    comCarreta, setComCarreta,
    comSprinkler, setComSprinkler,
    comGuarita, setComGuarita,
    filtrados, stats, filtrosAtivos, temFiltro,
    limpar, togglePublicado, geocodificarTodos, excluir,
    configCampos,
  } = useGalpoes();

  const [galpaoDetalhe, setGalpaoDetalhe] = useState<Galpao | null>(null);
  const [galpaoPreview, setGalpaoPreview] = useState<Galpao | null>(null);

  return (
    <>
    <div className="space-y-5">

      {/* Topo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Lista de Imoveis</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {stats.total} total · {stats.publicados} publicados · {stats.ocultos} ocultos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={geocodificarTodos}
            disabled={!!geocodingProgress}
            className="border border-gray-200 text-gray-500 px-3 py-1.5 text-xs hover:border-gray-400 hover:text-gray-900 transition-colors disabled:opacity-40"
          >
            {geocodingProgress ?? "Geocodificar todos"}
          </button>

          <PDFDownloadLink
            document={
              <PDFRelatorio
                galpoes={filtrados}
                filtros={filtrosAtivos}
                supabaseUrl={supabaseUrl}
                baseUrl={typeof window !== "undefined" ? window.location.origin : ""}
              />
            }
            fileName={`alphamix-galpoes-${new Date().toISOString().slice(0, 10)}.pdf`}
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
            href="/admin/imoveis/novo"
            className="bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            + Novo Galpao
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <GalpaoFiltros
        filtroCategoria={filtroCategoria} setFiltroCategoria={setFiltroCategoria}
        tipo={tipo} setTipo={setTipo}
        cidade={cidade} setCidade={setCidade}
        cidades={cidades}
        areaMin={areaMin} setAreaMin={setAreaMin}
        areaMax={areaMax} setAreaMax={setAreaMax}
        valorMin={valorMin} setValorMin={setValorMin}
        valorMax={valorMax} setValorMax={setValorMax}
        docasMin={docasMin} setDocasMin={setDocasMin}
        soPublicados={soPublicados} setSoPublicados={setSoPublicados}
        comCarreta={comCarreta} setComCarreta={setComCarreta}
        comSprinkler={comSprinkler} setComSprinkler={setComSprinkler}
        comGuarita={comGuarita} setComGuarita={setComGuarita}
        temFiltro={temFiltro}
        filtrosAtivos={filtrosAtivos}
        limpar={limpar}
      />

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
        <div className="text-sm text-gray-400 py-12 text-center">Nenhum galpao encontrado.</div>
      ) : (
        <div className="bg-white border border-gray-200 divide-y divide-gray-100">
          {filtrados.map((g) => (
            <GalpaoRow
              key={g.id}
              galpao={g}
              deletingId={deletingId}
              onTogglePublicado={togglePublicado}
              onStartDelete={setDeletingId}
              onConfirmDelete={excluir}
              onCancelDelete={() => setDeletingId(null)}
              onOpenDetalhe={setGalpaoDetalhe}
              onOpenPreview={setGalpaoPreview}
            />
          ))}
        </div>
      )}
    </div>

    {/* Modais */}
    {galpaoDetalhe && (
      <GalpaoDetalheModal
        galpao={galpaoDetalhe}
        onClose={() => setGalpaoDetalhe(null)}
        onOpenPreview={() => setGalpaoPreview(galpaoDetalhe)}
      />
    )}
    {galpaoPreview && (
      <GalpaoPreviewModal
        galpao={galpaoPreview}
        configCampos={configCampos}
        onClose={() => setGalpaoPreview(null)}
      />
    )}
    </>
  );
}
