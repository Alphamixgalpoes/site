import { createClient } from "@/lib/supabase-server";
import GalpaoForm from "../_components/GalpaoForm";
import type { ConfigCampo } from "@/lib/visibilidade";

export default async function NovoGalpaoPage() {
  const supabase = await createClient();
  const { data: configCampos } = await supabase
    .from("config_campos")
    .select("*")
    .order("label");

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-8">Novo Galpao</h1>
      <GalpaoForm configCampos={(configCampos ?? []) as ConfigCampo[]} />
    </div>
  );
}
