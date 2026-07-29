"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPost } from "@/lib/api-client";

export type ScrapingOverview = {
  total_fontes: number;
  fontes_ok: number;
  fontes_warning: number;
  fontes_error: number;
  fontes_stale: number;
  fontes_never: number;
  runs_last_7d: number;
  novos_last_7d: number;
};

export type RecentRun = {
  id: string;
  status: string;
  registros_scraped: number;
  registros_novos: number;
  registros_duplicados: number;
  erro_mensagem: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
};

export type FonteHealth = {
  fonte_id: string;
  nome: string;
  platform: string;
  status: "ok" | "warning" | "error" | "stale" | "never";
  last_run_at: string | null;
  last_success_at: string | null;
  success_rate_last_5: number;
  avg_novos_last_5: number;
  avg_duration_ms: number;
  recent_runs: RecentRun[];
};

export function useScrapingMonitor() {
  const [overview, setOverview] = useState<ScrapingOverview | null>(null);
  const [fontes, setFontes] = useState<FonteHealth[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [ov, fh] = await Promise.all([
        apiGet<ScrapingOverview>("/api/v1/scraping/monitor/overview", { auth: true }),
        apiGet<FonteHealth[]>("/api/v1/scraping/monitor/fontes", { auth: true }),
      ]);
      setOverview(ov);
      setFontes(fh);
    } catch (err) {
      console.error("Erro ao carregar monitor:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const executarRun = useCallback(async (runId: string) => {
    await apiPost(`/api/v1/scraping/executar/${runId}`, {}, { auth: true });
    await load();
  }, [load]);

  const executarTodos = useCallback(async () => {
    await apiPost("/api/v1/scraping/executar-todos", {}, { auth: true });
    await load();
  }, [load]);

  return { overview, fontes, loading, reload: load, executarRun, executarTodos };
}
