"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api-client";

type Props = {
  galpaoId: string;
  galpaoTitulo: string;
};

export default function LeadForm({ galpaoId, galpaoTitulo }: Props) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      await apiPost("/api/v1/leads", {
        nome,
        telefone,
        empresa,
        galpao_id: galpaoId,
        galpao_titulo: galpaoTitulo,
      });
      setEnviado(true);
    } catch {
      setErro("Erro ao enviar. Tente pelo WhatsApp.");
    } finally {
      setLoading(false);
    }
  }

  if (enviado) {
    return (
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-900">Contato recebido</p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          Retornaremos em breve pelo número informado.
        </p>
      </div>
    );
  }

  const inp = "w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 rounded-sm focus:outline-none focus:border-[#2e3092] bg-white placeholder:text-gray-300 transition-colors";

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <p className="text-xs text-gray-400 mb-3">Ou deixe seu contato</p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          placeholder="Nome *"
          className={inp}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <input
          type="tel"
          placeholder="Telefone *"
          className={inp}
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Empresa"
          className={inp}
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
        />
        {erro && <p className="text-xs text-red-500">{erro}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#2e3092] text-white px-6 py-2.5 text-sm font-bold rounded-sm hover:bg-[#252880] transition-colors disabled:opacity-40"
        >
          {loading ? "Enviando..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
