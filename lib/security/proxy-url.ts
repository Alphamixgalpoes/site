/**
 * Converte um storage_path do bucket 'galpoes' para a URL do proxy de imagem.
 * Todas as imagens públicas devem passar por este proxy — nunca expor a URL do Supabase diretamente.
 */
export function imgUrl(storagePath: string): string {
  return `/api/img?p=${encodeURIComponent(storagePath)}`;
}
