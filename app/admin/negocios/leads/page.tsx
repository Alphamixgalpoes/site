"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api-client";

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  empresa: string | null;
  galpao_titulo: string | null;
  galpao_id: string | null;
  contactado: boolean;
  created_at: string;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await apiGet<Lead[]>("/api/v1/leads", { auth: true });
      setLeads(data);
    } catch (err) {
      console.error("Erro ao carregar leads:", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleContactado(id: string, atual: boolean) {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, contactado: !atual } : l))
    );
    await apiPatch(`/api/v1/leads/${id}/toggle-contactado?current=${atual}`, { auth: true });
  }

  const pendentes = leads.filter((l) => !l.contactado).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {leads.length} total · {pendentes} pendente{pendentes !== 1 ? "s" : ""}
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>
      ) : leads.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center">
          Nenhum lead ainda. Os contatos enviados pelo site aparecerão aqui.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 divide-y divide-gray-100">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className={`flex items-center gap-4 px-4 py-3 transition-colors ${
                lead.contactado ? "opacity-50" : "hover:bg-gray-50"
              }`}
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{lead.nome}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  <a
                    href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {lead.telefone}
                  </a>
                  {lead.empresa && (
                    <span className="text-xs text-gray-400">{lead.empresa}</span>
                  )}
                </div>
                <p className="text-xs text-gray-300 mt-0.5 truncate">
                  {[
                    lead.galpao_titulo,
                    new Date(lead.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "2-digit", year: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    }),
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>

              {/* Ação */}
              <button
                onClick={() => toggleContactado(lead.id, lead.contactado)}
                className={`text-xs px-3 py-1 font-medium transition-colors min-w-[100px] text-center shrink-0 ${
                  lead.contactado
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {lead.contactado ? "Contactado" : "Pendente"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
