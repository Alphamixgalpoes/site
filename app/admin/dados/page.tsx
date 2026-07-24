"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import CentralPage from "../_components/CentralPage";

type MdmStats = {
  fontes: number;
  pendentes_processamento: number;
  cards_pendentes: number;
  cards_por_tipo: {
    criar: number;
    atualizar: number;
    mesclar: number;
    enriquecer: number;
    alertar: number;
  };
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

  return (
    <CentralPage
      title="Dados"
      subtitle="Master Data Management — fontes, cards e qualidade"
      stats={s ? [
        { label: "Fontes ativas", value: s.fontes, color: "blue" },
        { label: "Pendentes processamento", value: s.pendentes_processamento, color: s.pendentes_processamento > 0 ? "amber" : "gray" },
        { label: "Cards pendentes", value: s.cards_pendentes, color: s.cards_pendentes > 0 ? "amber" : "green" },
        { label: "Cards criar", value: s.cards_por_tipo.criar, color: "green" },
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
          label: "Cards",
          href: "/admin/dados/cards",
          description: "Fila de recomendacoes para revisar",
          icon: iconSvg("M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"),
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
      ]}
    />
  );
}
