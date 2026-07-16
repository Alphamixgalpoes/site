"use client";

import { useState, useEffect, useRef } from "react";
import { apiGet } from "@/lib/api-client";
import type { ContatoResumido } from "@/lib/types";

const TIPO_LABEL: Record<string, string> = {
  proprietario: "Proprietário",
  cliente: "Cliente",
  corretor_externo: "Corretor",
  advogado: "Advogado",
  engenheiro: "Engenheiro",
  cartorario: "Cartorário",
  funcionario_prefeitura: "Prefeitura",
  administradora: "Administradora",
  outro: "Outro",
};

export type ContatoPickerProps = {
  value: ContatoResumido | null;
  onChange: (contato: ContatoResumido | null) => void;
  label: string;
  placeholder?: string;
};

export default function ContatoPicker({
  value,
  onChange,
  label,
  placeholder = "Buscar contato…",
}: ContatoPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContatoResumido[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const data = await apiGet<ContatoResumido[]>("/api/v1/contatos/search", {
        auth: true,
        params: { q: query.trim() },
      });
      setResults(data);
      setOpen(true);
      setLoading(false);
    }, 300);
  }, [query]);

  function select(c: ContatoResumido) {
    onChange(c);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  const inputClass =
    "w-full border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-gray-900 rounded-none";

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>

      {value ? (
        <div className="flex items-center justify-between gap-2 border border-gray-300 px-3 py-2.5 bg-white">
          <div className="min-w-0">
            <span className="text-sm font-medium text-gray-900 truncate block">{value.nome}</span>
            {value.empresa && (
              <span className="text-xs text-gray-500 truncate block">{value.empresa}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 whitespace-nowrap">
              {TIPO_LABEL[value.tipo_principal] ?? value.tipo_principal}
            </span>
            <button
              type="button"
              onClick={clear}
              className="text-gray-400 hover:text-gray-700 text-lg leading-none"
              aria-label="Remover"
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            className={inputClass}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            onFocus={() => query.trim() && results.length > 0 && setOpen(true)}
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              Buscando…
            </span>
          )}
        </div>
      )}

      {open && !value && (
        <div className="absolute z-50 w-full top-full left-0 bg-white border border-gray-200 shadow-lg mt-0.5 max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              Nenhum contato encontrado.{" "}
              <a
                href="/admin/negocios/contatos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2e3092] underline"
              >
                Criar novo
              </a>
            </div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => select(c)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.nome}</p>
                  {c.empresa && (
                    <p className="text-xs text-gray-500 truncate">{c.empresa}</p>
                  )}
                </div>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 shrink-0 whitespace-nowrap">
                  {TIPO_LABEL[c.tipo_principal] ?? c.tipo_principal}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
