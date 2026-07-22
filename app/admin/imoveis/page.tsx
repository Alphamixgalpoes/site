"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import CentralPage from "../_components/CentralPage";

export default function ImoveisCentral() {
  const [stats, setStats] = useState({ total: 0, publicados: 0, ocultos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ publicado: boolean }[]>("/api/v1/imoveis", { auth: true }).then((data) => {
      const t = data.length;
      const p = data.filter((g) => g.publicado).length;
      setStats({ total: t, publicados: p, ocultos: t - p });
    }).catch((err) => {
      console.error("Erro ao carregar imóveis:", err);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <CentralPage
      title="Imoveis"
      subtitle={loading ? "Carregando..." : `${stats.total} imoveis cadastrados`}
      stats={loading ? [] : [
        { label: "Total", value: stats.total, color: "gray" },
        { label: "Publicados", value: stats.publicados, color: "green" },
        { label: "Ocultos", value: stats.ocultos, color: "amber" },
      ]}
      lenses={[
        { label: "Lista", href: "/admin/imoveis/lista", description: "Cadastro, filtros e gestao de todos os imoveis", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg> },
        { label: "Mapa", href: "/admin/imoveis/mapa", description: "Visualizacao geografica dos imoveis", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0-8.25a1.875 1.875 0 1 1 0 3.75M9 6.75a1.875 1.875 0 1 0 0 3.75m0 0V15m0 0a1.875 1.875 0 1 1 0 3.75M9 15a1.875 1.875 0 1 0 0 3.75M9 15l6-3m-6 7.5h6m-6 0a1.875 1.875 0 1 1 0 3.75M15 12a1.875 1.875 0 1 1 0-3.75M15 12a1.875 1.875 0 1 0 0-3.75M15 12V3.75m0 8.25a1.875 1.875 0 1 1 0 3.75M15 12a1.875 1.875 0 1 0 0 3.75" /></svg> },
        { label: "Consulta", href: "/admin/imoveis/consulta", description: "Filtros avancados e geracao de PDF", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg> },
        { label: "Placas", href: "/admin/imoveis/placas", description: "Controle de placas de venda e locacao", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg> },
      ]}
    />
  );
}
