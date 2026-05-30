import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import GalpaoForm from "../GalpaoForm";
import type { ConfigCampo } from "@/lib/visibilidade";

export default async function EditarGalpaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: galpao }, { data: configCampos }] = await Promise.all([
    supabase.from("galpoes").select("*").eq("id", id).single(),
    supabase.from("config_campos").select("*").order("label"),
  ]);

  if (!galpao) notFound();

  const { data: imagens } = await supabase
    .from("galpao_imagens")
    .select("id, storage_path, ordem")
    .eq("galpao_id", id)
    .order("ordem");

  const initial = {
    ...galpao,
    valor: galpao.valor?.toString() ?? "",
    area_total_m2: galpao.area_total_m2?.toString() ?? "",
    area_construida_m2: galpao.area_construida_m2?.toString() ?? "",
    area_piso_m2: galpao.area_piso_m2?.toString() ?? "",
    pe_direito_m: galpao.pe_direito_m?.toString() ?? "",
    numero_docas: galpao.numero_docas?.toString() ?? "0",
    potencia_eletrica_kva: galpao.potencia_eletrica_kva?.toString() ?? "",
    vagas_estacionamento: galpao.vagas_estacionamento?.toString() ?? "0",
    valor_condominio: galpao.valor_condominio?.toString() ?? "",
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-8">Editar Galpão</h1>
      <GalpaoForm
        initial={initial}
        imagens={imagens ?? []}
        configCampos={(configCampos ?? []) as ConfigCampo[]}
      />
    </div>
  );
}
