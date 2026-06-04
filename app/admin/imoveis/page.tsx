"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import CentralPage from "../_components/CentralPage";

export default function ImoveisCentral() {
  const [stats, setStats] = useState({ total: 0, publicados: 0, ocultos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { count: total } = await supabase.from("galpoes").select("*", { count: "exact", head: true });
      const { count: publicados } = await supabase.from("galpoes").select("*", { count: "exact", head: true }).eq("publicado", true);
      const t = total ?? 0;
      const p = publicados ?? 0;
      setStats({ total: t, publicados: p, ocultos: t - p });
      setLoading(false);
    }
    load();
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
        { label: "Lista", href: "/admin/imoveis/lista", description: "Cadastro, filtros e gestao de todos os imoveis" },
        { label: "Mapa", href: "/admin/imoveis/mapa", description: "Visualizacao geografica dos imoveis" },
        { label: "Consulta", href: "/admin/imoveis/consulta", description: "Filtros avancados e geracao de PDF" },
        { label: "Placas", href: "/admin/imoveis/placas", description: "Controle de placas de venda e locacao" },
      ]}
    />
  );
}
