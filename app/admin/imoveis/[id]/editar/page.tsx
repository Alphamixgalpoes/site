"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import ImovelForm from "../../_components/ImovelForm";
import type { ConfigCampo } from "@/lib/visibilidade";

export default function EditarImovelPage() {
  const { id } = useParams<{ id: string }>();
  const [initial, setInitial] = useState<any>(null);
  const [imagens, setImagens] = useState<any[]>([]);
  const [configCampos, setConfigCampos] = useState<ConfigCampo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  useEffect(() => {
    Promise.all([
      apiGet<any>(`/api/v1/imoveis/${id}`, { auth: true }),
      apiGet<ConfigCampo[]>("/api/v1/config/campos", { auth: true }),
    ]).then(([imovel, cfg]) => {
      if (!imovel) { setNotFoundState(true); return; }

      const imgs = (imovel.imovel_imagens ?? [])
        .sort((a: any, b: any) => a.ordem - b.ordem);

      setInitial({
        ...imovel,
        valor: imovel.valor?.toString() ?? "",
        area_total_m2: imovel.area_total_m2?.toString() ?? "",
        area_construida_m2: imovel.area_construida_m2?.toString() ?? "",
        area_piso_m2: imovel.area_piso_m2?.toString() ?? "",
        pe_direito_m: imovel.pe_direito_m?.toString() ?? "",
        numero_docas: imovel.numero_docas?.toString() ?? "0",
        potencia_eletrica_kva: imovel.potencia_eletrica_kva?.toString() ?? "",
        capacidade_piso_ton_m2: imovel.capacidade_piso_ton_m2?.toString() ?? "",
        area_escritorio_m2: imovel.area_escritorio_m2?.toString() ?? "",
        truck_court_m: imovel.truck_court_m?.toString() ?? "",
        logradouro: imovel.logradouro ?? "",
        numero: imovel.numero ?? "",
        complemento: imovel.complemento ?? "",
        uf: imovel.uf ?? "",
        vagas_estacionamento: imovel.vagas_estacionamento?.toString() ?? "0",
        valor_condominio: imovel.valor_condominio?.toString() ?? "",
      });
      setImagens(imgs);
      setConfigCampos(cfg);
    }).catch((err) => {
      console.error("Erro ao carregar imóvel:", err);
      setNotFoundState(true);
    }).finally(() => setLoading(false));
  }, [id]);

  if (notFoundState) notFound();

  if (loading) {
    return <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-8">Editar Imóvel</h1>
      <ImovelForm
        initial={initial}
        imagens={imagens}
        configCampos={configCampos}
      />
    </div>
  );
}
