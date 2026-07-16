"use client";

import { createClient } from "@/lib/supabase-browser";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function headers(auth: boolean): Promise<Record<string, string>> {
  const h: Record<string, string> = {};
  if (auth) {
    const token = await getToken();
    if (token) h["Authorization"] = `Bearer ${token}`;
  }
  return h;
}

export async function apiGet<T = unknown>(
  path: string,
  opts?: { auth?: boolean; params?: Record<string, string> },
): Promise<T> {
  const auth = opts?.auth ?? false;
  const url = new URL(`${API_URL}${path}`);
  if (opts?.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), { headers: await headers(auth) });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
  opts?: { auth?: boolean },
): Promise<T> {
  const auth = opts?.auth ?? false;
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await headers(auth)) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

export async function apiPatch<T = unknown>(
  path: string,
  opts?: { auth?: boolean },
): Promise<T> {
  const auth = opts?.auth ?? false;
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: await headers(auth),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API ${status}: ${body}`);
  }
}

/** URL base da API (usada para URLs em <img> tags, PDFs, etc.) */
export const API_BASE_URL = API_URL;
