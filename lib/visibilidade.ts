export type ConfigCampo = {
  campo_chave: string;
  label: string;
  confidencial: boolean;
  visivel_card: boolean;
  visivel_ficha: boolean;
};

export type OverridesVisibilidade = Record<string, { card: boolean; ficha: boolean }>;

/** Campos sempre visíveis — sem controles */
export const CAMPOS_FIXOS = ["titulo", "categoria", "tipo", "cidade"] as const;

/**
 * Retorna se um campo deve ser exibido num dado contexto,
 * considerando a config global e os overrides do imóvel.
 */
export function campoVisivel(
  campoChave: string,
  contexto: "card" | "ficha",
  configGlobal: ConfigCampo[],
  overrides: OverridesVisibilidade
): boolean {
  const global = configGlobal.find((c) => c.campo_chave === campoChave);
  if (!global) return false;
  if (overrides[campoChave] !== undefined) {
    return overrides[campoChave][contexto];
  }
  return contexto === "card" ? global.visivel_card : global.visivel_ficha;
}
