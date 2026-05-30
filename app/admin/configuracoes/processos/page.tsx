import { createClient } from "@/lib/supabase-server";
import ProcessoConfigClient from "./ProcessoConfigClient";

export type ItemTemplate = {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
};

export type CategoriaTemplate = {
  id: string;
  slug: string;
  label: string;
  ordem: number;
  itens: ItemTemplate[];
};

export type TipoTemplate = {
  id: string;
  slug: string;
  label: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  categorias: CategoriaTemplate[];
};

export default async function ProcessoConfigPage() {
  const supabase = await createClient();

  const { data: tipos } = await supabase
    .from("processo_tipos")
    .select(`
      id, slug, label, descricao, ativo, ordem,
      processo_tipo_categorias (
        id, slug, label, ordem,
        processo_tipo_itens ( id, titulo, descricao, ordem )
      )
    `)
    .order("ordem");

  const tiposHidratados: TipoTemplate[] = (tipos ?? []).map((t: any) => ({
    id: t.id,
    slug: t.slug,
    label: t.label,
    descricao: t.descricao,
    ativo: t.ativo,
    ordem: t.ordem,
    categorias: (t.processo_tipo_categorias ?? [])
      .sort((a: any, b: any) => a.ordem - b.ordem)
      .map((c: any) => ({
        id: c.id,
        slug: c.slug,
        label: c.label,
        ordem: c.ordem,
        itens: (c.processo_tipo_itens ?? []).sort((a: any, b: any) => a.ordem - b.ordem),
      })),
  }));

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Configuração de Processos</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Tipos, categorias e itens que são gerados automaticamente ao criar um novo processo.
        </p>
      </div>
      <ProcessoConfigClient tiposIniciais={tiposHidratados} />
    </div>
  );
}
