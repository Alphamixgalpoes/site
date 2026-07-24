"use client";

import { useState } from "react";
import { apiUpload, apiPost } from "@/lib/api-client";
import type { Fonte } from "./useFontes";

export function useSubmission() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Fonte | null>(null);

  async function submitSpreadsheet(nome: string, file: File, config?: Record<string, unknown>) {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const fields: Record<string, string> = { nome };
      if (config && Object.keys(config).length > 0) {
        fields.config = JSON.stringify(config);
      }
      const fonte = await apiUpload<Fonte>("/api/v1/mdm/submeter/planilha", file, fields, { auth: true });
      setResult(fonte);
      return fonte;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao submeter planilha";
      setError(msg);
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function submitUrl(nome: string, url: string, notas?: string) {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const fonte = await apiPost<Fonte>("/api/v1/mdm/submeter/url", { nome, url, notas }, { auth: true });
      setResult(fonte);
      return fonte;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao submeter URL";
      setError(msg);
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setError(null);
    setResult(null);
  }

  return { submitSpreadsheet, submitUrl, submitting, error, result, reset };
}
