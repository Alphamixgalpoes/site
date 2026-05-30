import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import ConfigCamposClient from "./ConfigCamposClient";
import type { ConfigCampo } from "@/lib/visibilidade";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("config_campos")
    .select("*")
    .order("label");

  return (
    <div className="max-w-2xl space-y-10">
      {/* Seção: Processos */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Configurações</h1>
        <div className="mt-4 border border-gray-200 bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Templates de Processos</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Tipos de processo, categorias e itens gerados automaticamente ao criar um novo processo.
            </p>
          </div>
          <Link href="/admin/configuracoes/processos"
            className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1.5 hover:border-gray-400 transition-colors shrink-0">
            Gerenciar →
          </Link>
        </div>
      </div>

      {/* Seção: Campos de imóveis */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Campos de imóveis</h2>
          <p className="text-sm text-gray-400 mt-1">
            Defina quais campos aparecem por padrão nos cards e fichas de todos os imóveis.
            Campos confidenciais ficam ocultos e podem ser liberados individualmente em cada imóvel.
          </p>
        </div>
        <ConfigCamposClient initial={(data ?? []) as ConfigCampo[]} />
      </div>
    </div>
  );
}
