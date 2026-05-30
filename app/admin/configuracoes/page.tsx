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
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Configurações de campos</h1>
        <p className="text-sm text-gray-400 mt-1">
          Defina quais campos aparecem por padrão nos cards e fichas de todos os imóveis.
          Campos confidenciais ficam ocultos e podem ser liberados individualmente em cada imóvel.
        </p>
      </div>
      <ConfigCamposClient initial={(data ?? []) as ConfigCampo[]} />
    </div>
  );
}
