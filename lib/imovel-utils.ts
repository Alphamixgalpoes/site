export function tipoLabel(tipo: string): string {
  return tipo === "venda" ? "Venda" : tipo === "locacao" ? "Locação" : "Venda / Locação";
}

export function categoriaLabel(categoria: string): string {
  return categoria === "loja" ? "Loja" : categoria === "terreno" ? "Terreno" : "Galpão";
}

export function usoTerrenoLabel(uso: string | null): string | null {
  return uso === "galpao" ? "Para galpão"
    : uso === "loja" ? "Para loja"
    : uso === "ambos" ? "Galpão e loja"
    : null;
}

/** Retorna a imagem de capa, com fallback para a primeira por ordem. */
export function getCapa<T extends { is_capa?: boolean }>(imagens: T[]): T | undefined {
  return imagens.find((i) => i.is_capa) ?? imagens[0];
}
