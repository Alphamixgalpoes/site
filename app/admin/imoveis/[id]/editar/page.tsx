"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import GalpaoForm from "../../_components/GalpaoForm";
import type { ConfigCampo } from "@/lib/visibilidade";

export default function EditarGalpaoPage() {
  const { id } = useParams<{ id: string }>();
  const [initial, setInitial] = useState<any>(null);
  const [imagens, setImagens] = useState<any[]>([]);
  const [configCampos, setConfigCampos] = useState<ConfigCampo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  useEffect(() => {
    Promise.all([
      apiGet<any>(`/api/v1/galpoes/${id}`, { auth: true }),
      apiGet<ConfigCampo[]>("/api/v1/config/campos", { auth: true }),
    ]).then(([galpao, cfg]) => {
      if (!galpao) { setNotFoundState(true); return; }

      const imgs = (galpao.galpao_imagens ?? [])
        .sort((a: any, b: any) => a.ordem - b.ordem);

      setInitial({
        ...galpao,
        valor: galpao.valor?.toString() ?? "",
        area_total_m2: galpao.area_total_m2?.toString() ?? "",
        area_construida_m2: galpao.area_construida_m2?.toString() ?? "",
        area_piso_m2: galpao.area_piso_m2?.toString() ?? "",
        pe_direito_m: galpao.pe_direito_m?.toString() ?? "",
        numero_docas: galpao.numero_docas?.toString() ?? "0",
        potencia_eletrica_kva: galpao.potencia_eletrica_kva?.toString() ?? "",
        capacidade_piso_ton_m2: galpao.capacidade_piso_ton_m2?.toString() ?? "",
        area_escritorio_m2: galpao.area_escritorio_m2?.toString() ?? "",
        truck_court_m: galpao.truck_court_m?.toString() ?? "",
        logradouro: galpao.logradouro ?? "",
        numero: galpao.numero ?? "",
        complemento: galpao.complemento ?? "",
        uf: galpao.uf ?? "",
        vagas_estacionamento: galpao.vagas_estacionamento?.toString() ?? "0",
        valor_condominio: galpao.valor_condominio?.toString() ?? "",
      });
      setImagens(imgs);
      setConfigCampos(cfg);
    }).catch((err) => {
      console.error("Erro ao carregar galpão:", err);
      setNotFoundState(true);
    }).finally(() => setLoading(false));
  }, [id]);

  if (notFoundState) notFound();

  if (loading) {
    return <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-8">Editar Galpao</h1>
      <GalpaoForm
        initial={initial}
        imagens={imagens}
        configCampos={configCampos}
      />
    </div>
  );
}
