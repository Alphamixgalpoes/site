"use client";

import { useRef, useState } from "react";
import { apiUpload } from "@/lib/api-client";
import { useFontes } from "../_hooks/useFontes";

type ParseResult = {
  total_rows: number;
  columns: string[];
  sample: Record<string, unknown>[];
};

type ImportResult = {
  importacao_id: string;
  total_registros: number;
  cards_gerados: number;
};

const CAMPOS_IMOVEL = [
  "titulo", "tipo", "categoria", "finalidade",
  "endereco", "bairro", "cidade", "estado", "cep",
  "area_total", "area_construida", "area_terreno", "area_fabril",
  "pe_direito", "docas", "vagas",
  "valor_venda", "valor_locacao", "valor_condominio", "valor_iptu",
  "latitude", "longitude",
  "observacoes",
];

export default function ImportarPage() {
  const { fontes, loading: loadingFontes } = useFontes();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "map" | "result">("upload");
  const [fonteId, setFonteId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    if (!file) return;
    setError(null);
    try {
      const res = await apiUpload<ParseResult>("/api/v1/mdm/parse", file, undefined, { auth: true });
      setParsed(res);
      // Auto-map columns with same name
      const autoMap: Record<string, string> = {};
      for (const col of res.columns) {
        const lower = col.toLowerCase().replace(/[^a-z0-9]/g, "_");
        if (CAMPOS_IMOVEL.includes(lower)) {
          autoMap[col] = lower;
        }
      }
      setMapping(autoMap);
      setStep("map");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar arquivo");
    }
  }

  async function handleImport() {
    if (!file || !fonteId || !parsed) return;
    setImporting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("fonte_id", fonteId);
      fd.append("schema_map", JSON.stringify(mapping));

      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/mdm/import`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data: ImportResult = await res.json();
      setResult(data);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na importacao");
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setStep("upload");
    setFile(null);
    setParsed(null);
    setMapping({});
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Importar</h1>
        <p className="text-sm text-gray-400 mt-0.5">Importar planilha CSV ou XLSX</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="bg-white border border-gray-200 p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fonte de dados</label>
            {loadingFontes ? (
              <p className="text-sm text-gray-400">Carregando fontes...</p>
            ) : fontes.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma fonte cadastrada. Crie uma em Fontes primeiro.</p>
            ) : (
              <select
                value={fonteId}
                onChange={(e) => setFonteId(e.target.value)}
                className="w-full text-sm border border-gray-200 px-3 py-2 bg-white"
              >
                <option value="">Selecione uma fonte</option>
                {fontes.filter((f) => f.ativo).map((f) => (
                  <option key={f.id} value={f.id}>{f.nome} ({f.tipo})</option>
                ))}
              </select>
            )}
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
            onClick={handleParse}
            disabled={!file || !fonteId}
            className="text-sm px-4 py-2 bg-[#2e3092] text-white hover:bg-[#252777] transition-colors font-medium disabled:opacity-50"
          >
            Processar arquivo
          </button>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === "map" && parsed && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 p-4">
            <p className="text-sm text-gray-700">
              <strong>{parsed.total_rows}</strong> linhas encontradas · <strong>{parsed.columns.length}</strong> colunas
            </p>
          </div>

          <div className="bg-white border border-gray-200 divide-y divide-gray-100">
            <div className="grid grid-cols-2 gap-4 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500">
              <span>Coluna do arquivo</span>
              <span>Campo do imovel</span>
            </div>
            {parsed.columns.map((col) => (
              <div key={col} className="grid grid-cols-2 gap-4 px-4 py-2 items-center">
                <span className="text-sm text-gray-700">{col}</span>
                <select
                  value={mapping[col] ?? ""}
                  onChange={(e) => {
                    setMapping((prev) => {
                      const next = { ...prev };
                      if (e.target.value) next[col] = e.target.value;
                      else delete next[col];
                      return next;
                    });
                  }}
                  className="text-sm border border-gray-200 px-2 py-1 bg-white"
                >
                  <option value="">— ignorar —</option>
                  {CAMPOS_IMOVEL.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Preview */}
          {parsed.sample.length > 0 && (
            <div>
              <h3 className="text-xs text-gray-500 mb-2">Amostra (primeiras linhas)</h3>
              <div className="overflow-x-auto border border-gray-200">
                <table className="text-xs min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {parsed.columns.map((c) => (
                        <th key={c} className="px-3 py-1.5 text-left text-gray-500 font-medium whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsed.sample.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {parsed.columns.map((c) => (
                          <td key={c} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                            {String(row[c] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={importing || Object.keys(mapping).length === 0}
              className="text-sm px-4 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            >
              {importing ? "Importando..." : "Importar"}
            </button>
            <button
              onClick={reset}
              className="text-sm px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === "result" && result && (
        <div className="bg-white border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-gray-900">Importacao concluida</p>
              <p className="text-sm text-gray-500">
                {result.total_registros} registro{result.total_registros !== 1 ? "s" : ""} processado{result.total_registros !== 1 ? "s" : ""} · {result.cards_gerados} card{result.cards_gerados !== 1 ? "s" : ""} gerado{result.cards_gerados !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = "/admin/dados/cards"}
              className="text-sm px-4 py-2 bg-[#2e3092] text-white hover:bg-[#252777] transition-colors font-medium"
            >
              Ver cards gerados
            </button>
            <button
              onClick={reset}
              className="text-sm px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Importar outro arquivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to get token for manual FormData fetch
async function getToken(): Promise<string | null> {
  try {
    const { createClient } = await import("@/lib/supabase-browser");
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}
