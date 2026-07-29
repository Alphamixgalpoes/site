"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiGet } from "@/lib/api-client";

export type RunSummary = {
  run_id: string;
  fonte_id: string;
  fonte_nome: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  registros_scraped: number;
  registros_novos: number;
  registros_duplicados: number;
  erro_mensagem: string | null;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  cached_requests: number;
};

export type RunLive = {
  run_id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  elapsed_seconds: number | null;
  registros_scraped: number;
  registros_novos: number;
};

export type RequestLogEntry = {
  id: string;
  url: string;
  domain: string;
  method: string;
  status_code: number | null;
  response_time_ms: number | null;
  cached: boolean;
  error: string | null;
  created_at: string | null;
};

export function useRunDetail(runId: string | null) {
  const [detail, setDetail] = useState<RunSummary | null>(null);
  const [live, setLive] = useState<RunLive | null>(null);
  const [requests, setRequests] = useState<RequestLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDetail = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    try {
      const [d, r] = await Promise.all([
        apiGet<RunSummary>(`/api/v1/scraping/monitor/runs/${runId}`, { auth: true }),
        apiGet<RequestLogEntry[]>(`/api/v1/scraping/monitor/runs/${runId}/requests`, { auth: true }),
      ]);
      setDetail(d);
      setRequests(r);
    } catch (err) {
      console.error("Erro ao carregar run detail:", err);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  // Poll live status while run is active
  useEffect(() => {
    if (!runId) return;

    const poll = async () => {
      try {
        const liveData = await apiGet<RunLive>(
          `/api/v1/scraping/monitor/runs/${runId}/live`,
          { auth: true },
        );
        setLive(liveData);

        if (liveData.status !== "processando") {
          // Run finished — load full detail and stop polling
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          loadDetail();
        }
      } catch {
        // Run may not exist yet, ignore
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [runId, loadDetail]);

  return { detail, live, requests, loading, reload: loadDetail };
}
