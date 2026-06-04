/**
 * Valida o header Referer para bloquear hotlinking externo.
 * Para adicionar um novo domínio permitido (ex: novo domínio do site), incluir em ALLOWED_ORIGINS.
 *
 * Compatível com Edge Runtime (sem imports Node.js).
 */
const ALLOWED_ORIGINS = [
  "https://www.alphamixgalpoes.com.br",
  "https://alphamixgalpoes.com.br",
  "https://petrusweb.vercel.app",
];

/**
 * Retorna true se o Referer for permitido.
 *
 * Regras:
 * - Referer ausente (acesso direto, bookmark) → permitido
 * - Em preview/development (Vercel) → sem restrição de Referer (URLs de preview variam)
 * - Em produção → apenas origens da lista ALLOWED_ORIGINS
 */
export function isAllowedReferer(referer: string | null): boolean {
  if (!referer) return true;
  // Em ambientes de preview e desenvolvimento não aplicar a restrição
  // (as URLs de preview da Vercel variam e não podem ser pré-listadas)
  if (process.env.VERCEL_ENV !== "production") return true;
  return ALLOWED_ORIGINS.some((o) => referer.startsWith(o));
}
