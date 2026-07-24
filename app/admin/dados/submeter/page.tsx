"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSubmission } from "../_hooks/useSubmission";

export default function SubmeterPage() {
  const [tab, setTab] = useState<"planilha" | "url">("planilha");
  const { submitSpreadsheet, submitUrl, submitting, error, result, reset } = useSubmission();

  // Planilha fields
  const fileRef = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // URL fields
  const [urlNome, setUrlNome] = useState("");
  const [url, setUrl] = useState("");
  const [notas, setNotas] = useState("");

  async function handleSubmitPlanilha() {
    if (!nome.trim() || !file) return;
    await submitSpreadsheet(nome.trim(), file);
  }

  async function handleSubmitUrl() {
    if (!urlNome.trim() || !url.trim()) return;
    await submitUrl(urlNome.trim(), url.trim(), notas.trim() || undefined);
  }

  function handleReset() {
    reset();
    setNome("");
    setFile(null);
    setUrlNome("");
    setUrl("");
    setNotas("");
    if (fileRef.current) fileRef.current.value = "";
  }

  if (result) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Submeter</h1>
          <p className="text-sm text-gray-400 mt-0.5">Enviar dados para processamento</p>
        </div>
        <div className="bg-white border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-gray-900">Fonte criada com sucesso</p>
              <p className="text-sm text-gray-500">
                {result.nome} — {result.submission_type === "spreadsheet" ? "planilha" : "URL"}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/admin/dados/fontes/${result.id}`}
              className="text-sm px-4 py-2 bg-[#2e3092] text-white hover:bg-[#252777] transition-colors font-medium"
            >
              Ver fonte
            </Link>
            <button
              onClick={handleReset}
              className="text-sm px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Submeter outro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Submeter</h1>
        <p className="text-sm text-gray-400 mt-0.5">Enviar dados para processamento</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab("planilha")}
          className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors ${
            tab === "planilha"
              ? "border-[#2e3092] text-[#2e3092]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Planilha
        </button>
        <button
          onClick={() => setTab("url")}
          className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors ${
            tab === "url"
              ? "border-[#2e3092] text-[#2e3092]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          URL
        </button>
      </div>

      {/* Planilha form */}
      {tab === "planilha" && (
        <div className="bg-white border border-gray-200 p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nome da fonte</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Planilha proprietarios Jul/2026"
              className="w-full text-sm border border-gray-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Arquivo (CSV ou XLSX)</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-gray-600"
            />
          </div>
          <button
            onClick={handleSubmitPlanilha}
            disabled={submitting || !nome.trim() || !file}
            className="text-sm px-4 py-2 bg-[#2e3092] text-white hover:bg-[#252777] transition-colors font-medium disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Submeter planilha"}
          </button>
        </div>
      )}

      {/* URL form */}
      {tab === "url" && (
        <div className="bg-white border border-gray-200 p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nome da fonte</label>
            <input
              value={urlNome}
              onChange={(e) => setUrlNome(e.target.value)}
              placeholder="Ex: OLX Barueri"
              className="w-full text-sm border border-gray-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full text-sm border border-gray-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalhes sobre a fonte, frequencia de atualizacao..."
              rows={3}
              className="w-full text-sm border border-gray-200 px-3 py-2 resize-none"
            />
          </div>
          <button
            onClick={handleSubmitUrl}
            disabled={submitting || !urlNome.trim() || !url.trim()}
            className="text-sm px-4 py-2 bg-[#2e3092] text-white hover:bg-[#252777] transition-colors font-medium disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Submeter URL"}
          </button>
        </div>
      )}
    </div>
  );
}
