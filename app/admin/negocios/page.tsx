"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import CentralPage from "../_components/CentralPage";

export default function NegociosCentral() {
  const [stats, setStats] = useState({ leads: 0, emAndamento: 0, concluidos: 0, contatos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ count: leads }, { count: emAndamento }, { count: concluidos }, { count: contatos }] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("processos").select("*", { count: "exact", head: true }).eq("status", "em_andamento"),
        supabase.from("processos").select("*", { count: "exact", head: true }).eq("status", "concluido"),
        supabase.from("contatos").select("*", { count: "exact", head: true }).eq("ativo", true),
      ]);
      setStats({ leads: leads ?? 0, emAndamento: emAndamento ?? 0, concluidos: concluidos ?? 0, contatos: contatos ?? 0 });
      setLoading(false);
    }
    load();
  }, []);

  return (
    <CentralPage
      title="Negocios"
      subtitle={loading ? "Carregando..." : `${stats.emAndamento} processos em andamento`}
      stats={loading ? [] : [
        { label: "Leads", value: stats.leads, color: "blue" },
        { label: "Em andamento", value: stats.emAndamento, color: "amber" },
        { label: "Concluidos", value: stats.concluidos, color: "green" },
        { label: "Contatos", value: stats.contatos, color: "gray" },
      ]}
      lenses={[
        { label: "Leads", href: "/admin/negocios/leads", description: "Contatos recebidos pelo site" },
        { label: "Pipeline", href: "/admin/negocios/pipeline", description: "Processos de venda, locacao e regularizacao" },
        { label: "Concluidos", href: "/admin/negocios/concluidos", description: "Historico de negocios fechados" },
        { label: "Contatos", href: "/admin/negocios/contatos", description: "Agenda de proprietarios, clientes e parceiros" },
      ]}
    />
  );
}
