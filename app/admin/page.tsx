import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import TogglePublicado from "./TogglePublicado";
import DeleteGalpao from "./DeleteGalpao";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: galpoes } = await supabase
    .from("galpoes")
    .select("id, titulo, tipo, valor, cidade, publicado, area_construida_m2")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Galpões</h1>
          <p className="text-sm text-gray-500 mt-1">{galpoes?.length ?? 0} imóveis cadastrados</p>
        </div>
        <Link
          href="/admin/galpoes/novo"
          className="bg-gray-900 text-white px-5 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Novo Galpão
        </Link>
      </div>

      {!galpoes?.length ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          Nenhum galpão cadastrado ainda.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 divide-y divide-gray-200">
          {galpoes.map((g) => (
            <div key={g.id} className="flex items-center justify-between px-6 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{g.titulo}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {g.cidade} · {g.area_construida_m2 ? `${g.area_construida_m2} m²` : "—"} ·{" "}
                  {g.tipo === "venda" ? "Venda" : g.tipo === "locacao" ? "Locação" : "Venda/Locação"}
                  {g.valor ? ` · R$ ${Number(g.valor).toLocaleString("pt-BR")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-4 ml-6">
                <TogglePublicado id={g.id} publicado={g.publicado} />
                <Link
                  href={`/admin/galpoes/${g.id}`}
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Editar
                </Link>
                <DeleteGalpao id={g.id} titulo={g.titulo} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
