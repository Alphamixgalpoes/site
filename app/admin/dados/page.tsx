"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import CentralPage from "../_components/CentralPage";

type MdmStats = {
  fontes: number;
  pendentes_processamento: number;
  enrichment: Record<string, number>;
};

const iconSvg = (d: string) => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

export default function DadosPage() {
  const [stats, setStats] = useState<MdmStats | null>(null);

  useEffect(() => {
    apiGet<MdmStats>("/api/v1/mdm/stats", { auth: true })
      .then(setStats)
      .catch(console.error);
  }, []);

  const s = stats;
  const enrichPendentes = s?.enrichment?.pendente ?? 0;
  const enrichAndamento = s?.enrichment?.em_andamento ?? 0;

  return (
    <CentralPage
      title="Dados"
      subtitle="Master Data Management — fontes, enriquecimento e qualidade"
      stats={s ? [
        { label: "Fontes ativas", value: s.fontes, color: "blue" },
        { label: "Pendentes processamento", value: s.pendentes_processamento, color: s.pendentes_processamento > 0 ? "amber" : "gray" },
        { label: "Cards enriquecimento", value: enrichPendentes, color: enrichPendentes > 0 ? "amber" : "green" },
        { label: "Em andamento", value: enrichAndamento, color: enrichAndamento > 0 ? "blue" : "gray" },
      ] : []}
      lenses={[
        {
          label: "Submeter",
          href: "/admin/dados/submeter",
          description: "Enviar planilha ou URL",
          icon: iconSvg("M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"),
        },
        {
          label: "Fontes",
          href: "/admin/dados/fontes",
          description: "Gerenciar fontes de dados",
          icon: iconSvg("M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375"),
        },
        {
          label: "Enriquecimento",
          href: "/admin/dados/enrichment",
          description: "Comparar e enriquecer imoveis",
          icon: iconSvg("M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"),
        },
        {
          label: "Qualidade",
          href: "/admin/dados/qualidade",
          description: "Ranking e scoring de dados",
          icon: iconSvg("M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"),
        },
        {
          label: "Scraping",
          href: "/admin/dados/scraping",
          description: "Fila de URLs para scraping",
          icon: iconSvg("M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.732-3.558"),
        },
        {
          label: "Registros",
          href: "/admin/dados/registros",
          description: "Capturas rapidas (fotos + audio)",
          icon: iconSvg("M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"),
        },
      ]}
    />
  );
}
