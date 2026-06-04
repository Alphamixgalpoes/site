/**
 * Orquestra a busca de imagem no Supabase Storage e aplicação do watermark.
 * A imagem é buscada server-side — a URL real do Supabase nunca é exposta ao cliente.
 */
import { applyWatermark } from "./watermark";

function isValidStoragePath(p: string): boolean {
  if (!p) return false;
  // Bloquear path traversal e URLs absolutas
  if (p.includes("..") || p.includes("//") || p.startsWith("/")) return false;
  // Bloquear caracteres suspeitos
  if (/[<>|&;`$]/.test(p)) return false;
  return true;
}

export async function fetchImageWithWatermark(
  storagePath: string
): Promise<Buffer | null> {
  if (!isValidStoragePath(storagePath)) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/galpoes/${storagePath}`;

  try {
    const response = await fetch(publicUrl);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    return applyWatermark(arrayBuffer);
  } catch {
    return null;
  }
}
