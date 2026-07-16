"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
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

export default function ProcessoConfigPage() {
  const [tipos, setTipos] = useState<TipoTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<any[]>("/api/v1/config/processo-tipos", { auth: true, params: { full: "true" } }).then((data) => {
      const hidratados: TipoTemplate[] = data.map((t) => ({
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
      setTipos(hidratados);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Configuração de Processos</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Tipos, categorias e itens que são gerados automaticamente ao criar um novo processo.
        </p>
      </div>
      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>
      ) : (
        <ProcessoConfigClient tiposIniciais={tipos} />
      )}
    </div>
  );
}
