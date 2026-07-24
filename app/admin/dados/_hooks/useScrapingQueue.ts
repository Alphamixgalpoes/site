"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";

export type ScrapingRun = {
  id: string;
  fonte_id: string;
  url: string;
  status: string;
  registros_scraped: number;
  registros_novos: number;
  registros_duplicados: number;
  erro_mensagem: string | null;
  notas_dev: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
};

export function useScrapingQueue() {
  const [runs, setRuns] = useState<ScrapingRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await apiGet<ScrapingRun[]>("/api/v1/mdm/scraping/fila", { auth: true });
      setRuns(data);
    } catch (err) {
      console.error("Erro ao carregar fila de scraping:", err);
    } finally {
      setLoading(false);
    }
  }

  return { runs, loading, reload: load };
}
