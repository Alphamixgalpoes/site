"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import ImovelForm from "../_components/ImovelForm";
import type { ConfigCampo } from "@/lib/visibilidade";

export default function NovoImovelPage() {
  const [configCampos, setConfigCampos] = useState<ConfigCampo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<ConfigCampo[]>("/api/v1/config/campos", { auth: true }).then((data) => {
      setConfigCampos(data);
    }).catch((err) => {
      console.error("Erro ao carregar config:", err);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-8">Novo Imóvel</h1>
      <ImovelForm configCampos={configCampos} />
    </div>
  );
}
