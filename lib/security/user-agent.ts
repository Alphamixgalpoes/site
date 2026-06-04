/**
 * Bloqueio de User-Agents conhecidos de scrapers e clientes HTTP automatizados.
 * Para adicionar novos padrões, incluir nesta lista — sem precisar alterar outros arquivos.
 *
 * Compatível com Edge Runtime (sem imports Node.js).
 */
const BLOCKED_PATTERNS = [
  "python-requests",
  "python-urllib",
  "curl/",
  "wget/",
  "go-http-client",
  "java/",
  "libwww",
  "scrapy",
  "httpx",
  "aiohttp",
  "apache-httpclient",
  "okhttp",
  "axios/",
  "node-fetch",
];

export function isBlockedUserAgent(ua: string | null): boolean {
  if (!ua) return true; // sem UA = bloquear
  const lower = ua.toLowerCase();
  return BLOCKED_PATTERNS.some((p) => lower.includes(p));
}
