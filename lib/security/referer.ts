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
 * Referer ausente (acesso direto, bookmark) é permitido para não bloquear usuários legítimos.
 */
export function isAllowedReferer(referer: string | null): boolean {
  if (!referer) return true;
  return ALLOWED_ORIGINS.some((o) => referer.startsWith(o));
}
