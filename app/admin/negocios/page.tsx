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
        { label: "Leads", href: "/admin/negocios/leads", description: "Contatos recebidos pelo site", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" /></svg> },
        { label: "Pipeline", href: "/admin/negocios/pipeline", description: "Processos de venda, locacao e regularizacao", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" /></svg> },
        { label: "Concluidos", href: "/admin/negocios/concluidos", description: "Historico de negocios fechados", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
        { label: "Contatos", href: "/admin/negocios/contatos", description: "Agenda de proprietarios, clientes e parceiros", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg> },
      ]}
    />
  );
}
