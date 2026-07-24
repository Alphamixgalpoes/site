"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useFonteDetail } from "../../_hooks/useFonteDetail";

const statusLabels: Record<string, string> = {
  pendente_raw: "Pendente",
  tem_raw: "Tem Raw",
  tem_clean: "Tem Clean",
  cards_gerados: "Cards Gerados",
};

const statusColors: Record<string, string> = {
  pendente_raw: "bg-gray-100 text-gray-600",
  tem_raw: "bg-amber-100 text-amber-700",
  tem_clean: "bg-blue-100 text-blue-700",
  cards_gerados: "bg-green-100 text-green-700",
};

export default function FonteDetailPage() {
  const params = useParams();
  const fonteId = params.id as string;
  const {
    fonte, loading, rawCount, cleanCount,
    rawRegistros, cleanRegistros,
    resubmit, resubmitting,
  } = useFonteDetail(fonteId);

  const fileRef = useRef<HTMLInputElement>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [showClean, setShowClean] = useState(false);
  const [resubError, setResubError] = useState<string | null>(null);

  async function handleResubmit() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setResubError(null);
    try {
      await resubmit(file);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setResubError("Erro ao reenviar arquivo");
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>;
  }

  if (!fonte) {
    return (
      <div className="text-sm text-gray-400 py-12 text-center">
        Fonte nao encontrada.{" "}
        <Link href="/admin/dados/fontes" className="text-[#2e3092] hover:underline">Voltar</Link>
      </div>
    );
  }

  const status = fonte.processing_status || "pendente_raw";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/admin/dados/fontes" className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Voltar para fontes
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{fonte.nome}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {fonte.submission_type === "url" ? "URL" : "Planilha"}
              {fonte.created_at && ` · Criada em ${new Date(fonte.created_at).toLocaleDateString("pt-BR")}`}
              {fonte.last_processed_at && ` · Processada ${new Date(fonte.last_processed_at).toLocaleDateString("pt-BR")}`}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 font-medium ${statusColors[status] || statusColors.pendente_raw}`}>
            {statusLabels[status] || status}
          </span>
        </div>

        {fonte.submission_type === "url" && fonte.url && (
          <div className="text-sm text-gray-600">
            <span className="text-xs text-gray-400">URL: </span>
            {fonte.url}
          </div>
        )}

        {fonte.notas && (
          <div className="text-sm text-gray-600">
            <span className="text-xs text-gray-400">Notas: </span>
            {fonte.notas}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="border border-gray-200 px-3 py-2">
            <p className="text-xl font-semibold text-gray-900">{rawCount}</p>
            <p className="text-[10px] text-gray-400">Registros Raw</p>
          </div>
          <div className="border border-gray-200 px-3 py-2">
            <p className="text-xl font-semibold text-gray-900">{cleanCount}</p>
            <p className="text-[10px] text-gray-400">Registros Clean</p>
          </div>
        </div>
      </div>

      {/* Reenviar planilha */}
      {fonte.submission_type === "spreadsheet" && (
        <div className="bg-white border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-900">Reenviar planilha</h2>
          <p className="text-xs text-gray-400">Substitui os dados raw atuais. Clean e cards anteriores serao removidos.</p>
          {resubError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">{resubError}</div>
          )}
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="text-sm text-gray-600"
            />
            <button
              onClick={handleResubmit}
              disabled={resubmitting}
              className="text-sm px-4 py-2 bg-amber-500 text-white hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 shrink-0"
            >
              {resubmitting ? "Reenviando..." : "Reenviar"}
            </button>
          </div>
        </div>
      )}

      {/* Raw section */}
      <div className="bg-white border border-gray-200">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-gray-900">Dados Brutos (Raw)</h2>
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500">{rawCount}</span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${showRaw ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {showRaw && rawRegistros.length > 0 && (
          <div className="border-t border-gray-200 overflow-x-auto">
            <RegistroTable registros={rawRegistros} field="dados_brutos" />
          </div>
        )}
        {showRaw && rawRegistros.length === 0 && (
          <div className="border-t border-gray-200 px-4 py-6 text-sm text-gray-400 text-center">
            Nenhum registro raw
          </div>
        )}
      </div>

      {/* Clean section */}
      <div className="bg-white border border-gray-200">
        <button
          onClick={() => setShowClean(!showClean)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-gray-900">Dados Limpos (Clean)</h2>
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600">{cleanCount}</span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${showClean ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {showClean && cleanRegistros.length > 0 && (
          <div className="border-t border-gray-200 overflow-x-auto">
            <RegistroTable registros={cleanRegistros} field="dados_normalizados" />
          </div>
        )}
        {showClean && cleanRegistros.length === 0 && (
          <div className="border-t border-gray-200 px-4 py-6 text-sm text-gray-400 text-center">
            Nenhum registro clean. Processamento via API necessario.
          </div>
        )}
      </div>
    </div>
  );
}

type Registro = {
  id: string;
  dados_brutos: Record<string, unknown>;
  dados_normalizados: Record<string, unknown> | null;
  [key: string]: unknown;
};

function RegistroTable({ registros, field }: { registros: Registro[]; field: "dados_brutos" | "dados_normalizados" }) {
  const MAX_ROWS = 50;
  const subset = registros.slice(0, MAX_ROWS);

  // Collect all keys from the data field
  const keys = new Set<string>();
  for (const r of subset) {
    const data = r[field] as Record<string, unknown> | null;
    if (data) Object.keys(data).forEach((k) => keys.add(k));
  }
  const columns = Array.from(keys);

  if (columns.length === 0) {
    return <div className="px-4 py-6 text-sm text-gray-400 text-center">Sem dados</div>;
  }

  return (
    <>
      <table className="text-xs min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-1.5 text-left text-gray-500 font-medium whitespace-nowrap">#</th>
            {columns.map((c) => (
              <th key={c} className="px-3 py-1.5 text-left text-gray-500 font-medium whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {subset.map((r, i) => {
            const data = r[field] as Record<string, unknown> | null;
            return (
              <tr key={r.id}>
                <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                {columns.map((c) => (
                  <td key={c} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                    {String(data?.[c] ?? "")}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {registros.length > MAX_ROWS && (
        <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-200">
          Mostrando {MAX_ROWS} de {registros.length} registros
        </div>
      )}
    </>
  );
}
