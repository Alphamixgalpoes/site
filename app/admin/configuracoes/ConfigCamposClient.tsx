"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { ConfigCampo } from "@/lib/visibilidade";

export default function ConfigCamposClient({ initial }: { initial: ConfigCampo[] }) {
  const [campos, setCampos] = useState<ConfigCampo[]>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [erro, setErro] = useState("");

  function toggleConfidencial(chave: string, val: boolean) {
    setCampos((prev) =>
      prev.map((c) =>
        c.campo_chave === chave
          ? { ...c, confidencial: val, visivel_card: val ? false : c.visivel_card, visivel_ficha: val ? false : c.visivel_ficha }
          : c
      )
    );
  }

  function toggleCard(chave: string, val: boolean) {
    setCampos((prev) => prev.map((c) => (c.campo_chave === chave ? { ...c, visivel_card: val } : c)));
  }

  function toggleFicha(chave: string, val: boolean) {
    setCampos((prev) => prev.map((c) => (c.campo_chave === chave ? { ...c, visivel_ficha: val } : c)));
  }

  async function handleSave() {
    setSaving(true);
    setErro("");
    const supabase = createClient();
    const { error } = await supabase
      .from("config_campos")
      .upsert(campos, { onConflict: "campo_chave" });
    setSaving(false);
    if (error) {
      setErro(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div>
      {/* Campos fixos */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Campos fixos — sempre visíveis
        </p>
        <div className="flex flex-wrap gap-2">
          {["Título", "Categoria", "Tipo / Negócio", "Cidade"].map((label) => (
            <span key={label} className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-sm">
              📌 {label}
            </span>
          ))}
        </div>
      </div>

      {/* Tabela de campos configuráveis */}
      <div className="border border-gray-200 rounded-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_72px_72px] text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 px-4 py-3 border-b border-gray-200">
          <span>Campo</span>
          <span className="text-center">Confidencial</span>
          <span className="text-center">Card</span>
          <span className="text-center">Ficha</span>
        </div>
        <div className="divide-y divide-gray-100">
          {campos.map((c) => (
            <div
              key={c.campo_chave}
              className={`grid grid-cols-[1fr_100px_72px_72px] items-center px-4 py-3 ${
                c.confidencial ? "bg-amber-50" : ""
              }`}
            >
              <span className="text-sm text-gray-900 flex items-center gap-2">
                {c.label}
                {c.confidencial && <span className="text-xs text-amber-600">🔒</span>}
              </span>
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={c.confidencial}
                  onChange={(e) => toggleConfidencial(c.campo_chave, e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={c.visivel_card}
                  disabled={c.confidencial}
                  onChange={(e) => toggleCard(c.campo_chave, e.target.checked)}
                  className="w-4 h-4 accent-[#2e3092] cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                />
              </div>
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={c.visivel_ficha}
                  disabled={c.confidencial}
                  onChange={(e) => toggleFicha(c.campo_chave, e.target.checked)}
                  className="w-4 h-4 accent-[#2e3092] cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#2e3092] text-white px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>
        {saved && <span className="text-xs text-green-600 font-semibold">✓ Salvo com sucesso</span>}
        {erro && <span className="text-xs text-red-600">{erro}</span>}
      </div>
    </div>
  );
}
