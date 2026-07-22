"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost, apiDelete, apiPatch } from "@/lib/api-client";
import { SUPABASE_URL } from "@/lib/constants";

type Publicacao = {
  imovel_id: string;
  titulo: string | null;
  descricao: string | null;
  slug: string | null;
  destaque: boolean;
  ativo: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
};

type ImovelResumo = {
  id: string;
  titulo: string;
  cidade: string;
  categoria: string;
  tipo: string;
  publicado: boolean;
  imovel_imagens: { storage_path: string; ordem: number; is_capa: boolean }[];
};

export default function PublicacaoPage() {
  const [publicados, setPublicados] = useState<Publicacao[]>([]);
  const [imoveis, setImoveis] = useState<ImovelResumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<Publicacao[]>("/api/v1/publicacao", { auth: true }),
      apiGet<ImovelResumo[]>("/api/v1/imoveis", { auth: true }),
    ]).then(([pubs, ims]) => {
      setPublicados(pubs);
      setImoveis(ims);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pubIds = new Set(publicados.map((p) => p.imovel_id));
  const naoPublicados = imoveis.filter((i) => !pubIds.has(i.id));

  async function publicar(id: string) {
    const imovel = imoveis.find((i) => i.id === id);
    const pub = await apiPost<Publicacao>(`/api/v1/publicacao/${id}`, {}, { auth: true });
    setPublicados((prev) => [pub, ...prev]);
    setImoveis((prev) => prev.map((i) => i.id === id ? { ...i, publicado: true } : i));
  }

  async function despublicar(id: string) {
    await apiDelete(`/api/v1/publicacao/${id}`, { auth: true });
    setPublicados((prev) => prev.filter((p) => p.imovel_id !== id));
    setImoveis((prev) => prev.map((i) => i.id === id ? { ...i, publicado: false } : i));
  }

  async function toggleDestaque(id: string, atual: boolean) {
    const updated = await apiPatch<Publicacao>(`/api/v1/publicacao/${id}`, { destaque: !atual }, { auth: true });
    setPublicados((prev) => prev.map((p) => p.imovel_id === id ? updated : p));
  }

  function getImovel(id: string) {
    return imoveis.find((i) => i.id === id);
  }

  function getCapa(imovel: ImovelResumo | undefined): string | null {
    if (!imovel?.imovel_imagens?.length) return null;
    const sorted = [...imovel.imovel_imagens].sort((a, b) => a.ordem - b.ordem);
    const capa = sorted.find((i) => i.is_capa) ?? sorted[0];
    return `${SUPABASE_URL}/storage/v1/object/public/imoveis/${capa.storage_path}`;
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Gestao de Publicacao</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {publicados.length} publicado{publicados.length !== 1 ? "s" : ""} · {naoPublicados.length} nao publicado{naoPublicados.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Publicados */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Publicados no site</h2>
        {publicados.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200">
            Nenhum imovel publicado ainda.
          </p>
        ) : (
          <div className="bg-white border border-gray-200 divide-y divide-gray-100">
            {publicados.map((pub) => {
              const imovel = getImovel(pub.imovel_id);
              const capaUrl = getCapa(imovel);
              return (
                <div key={pub.imovel_id} className="flex items-center gap-4 px-4 py-3">
                  {/* Thumbnail */}
                  <div className="w-16 h-12 bg-gray-100 shrink-0 overflow-hidden">
                    {capaUrl ? (
                      <img src={capaUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">
                        Sem foto
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {imovel?.titulo ?? pub.titulo ?? pub.imovel_id}
                    </p>
                    <p className="text-xs text-gray-400">
                      {imovel?.cidade ?? ""} · {pub.published_at ? new Date(pub.published_at).toLocaleDateString("pt-BR") : ""}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleDestaque(pub.imovel_id, pub.destaque)}
                      className={`text-xs px-2 py-1 border transition-colors ${
                        pub.destaque
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : "border-gray-200 text-gray-400 hover:border-gray-400"
                      }`}
                      title={pub.destaque ? "Remover destaque" : "Marcar como destaque"}
                    >
                      {pub.destaque ? "Destaque" : "Destacar"}
                    </button>
                    <Link
                      href={`/admin/imoveis/${pub.imovel_id}/editar`}
                      className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 border border-gray-200 hover:border-gray-400 transition-colors"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => despublicar(pub.imovel_id)}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 hover:border-red-400 transition-colors"
                    >
                      Despublicar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nao publicados */}
      {naoPublicados.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Disponiveis para publicar</h2>
          <div className="bg-white border border-gray-200 divide-y divide-gray-100">
            {naoPublicados.map((imovel) => {
              const capaUrl = getCapa(imovel);
              return (
                <div key={imovel.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-16 h-12 bg-gray-100 shrink-0 overflow-hidden">
                    {capaUrl ? (
                      <img src={capaUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">
                        Sem foto
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{imovel.titulo}</p>
                    <p className="text-xs text-gray-400">{imovel.cidade}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/imoveis/${imovel.id}/editar`}
                      className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 border border-gray-200 hover:border-gray-400 transition-colors"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => publicar(imovel.id)}
                      className="text-xs text-green-600 hover:text-green-800 px-2 py-1 border border-green-200 hover:border-green-400 transition-colors"
                    >
                      Publicar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
