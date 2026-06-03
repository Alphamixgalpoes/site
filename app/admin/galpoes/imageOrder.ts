// ── Funções puras de ordenação por zona ──────────────────────────────────────
//
// Zona 0: capa (posição 0, sempre primeira)
// Zona 1: visíveis sem capa (ordenadas pelo usuário via drag)
// Zona 2: ocultas (mais recente → mais próxima do limite com zona 1)

export type ImagemOrdenavel = {
  id: string;
  ordem: number;
  is_capa: boolean;
  visivel_site: boolean;
  storage_path: string;
};

/** Nova capa → posição 0. Capa anterior (se visível) → posição 1. */
export function applySetCapa<T extends ImagemOrdenavel>(images: T[], id: string): T[] {
  const target = images.find((i) => i.id === id);
  if (!target) return images;

  const newCapa = { ...target, is_capa: true, visivel_site: true } as T;
  const oldCapa = images.find((i) => i.is_capa && i.id !== id);
  const oldCapaUpdated = oldCapa ? ({ ...oldCapa, is_capa: false } as T) : null;

  const visibleRest = images
    .filter((i) => i.visivel_site && !i.is_capa && i.id !== id)
    .sort((a, b) => a.ordem - b.ordem);
  const hidden = images
    .filter((i) => !i.visivel_site && i.id !== id)
    .sort((a, b) => a.ordem - b.ordem);

  const result: T[] = [
    newCapa,
    ...(oldCapaUpdated && oldCapaUpdated.visivel_site ? [oldCapaUpdated] : []),
    ...visibleRest,
    ...(oldCapaUpdated && !oldCapaUpdated.visivel_site ? [oldCapaUpdated] : []),
    ...hidden,
  ];

  return result.map((img, i) => ({ ...img, ordem: i }));
}

/** Imagem recém-oculta → início da zona 2 (mais recente = mais próxima dos visíveis). */
export function applyHide<T extends ImagemOrdenavel>(images: T[], id: string): T[] {
  const target = images.find((i) => i.id === id);
  if (!target) return images;

  const justHidden = { ...target, visivel_site: false, is_capa: false } as T;
  const capa = images.filter((i) => i.is_capa && i.id !== id);
  const visible = images
    .filter((i) => i.visivel_site && !i.is_capa && i.id !== id)
    .sort((a, b) => a.ordem - b.ordem);
  const alreadyHidden = images
    .filter((i) => !i.visivel_site && i.id !== id)
    .sort((a, b) => a.ordem - b.ordem);

  return [...capa, ...visible, justHidden, ...alreadyHidden].map((img, i) => ({
    ...img,
    ordem: i,
  }));
}

/** Imagem recém-visível → fim da zona 1. */
export function applyShow<T extends ImagemOrdenavel>(images: T[], id: string): T[] {
  const updated = images.map((i) => (i.id === id ? { ...i, visivel_site: true } : i));
  const capa = updated.filter((i) => i.is_capa).sort((a, b) => a.ordem - b.ordem);
  const visible = updated
    .filter((i) => i.visivel_site && !i.is_capa)
    .sort((a, b) => a.ordem - b.ordem);
  const hidden = updated.filter((i) => !i.visivel_site).sort((a, b) => a.ordem - b.ordem);
  return [...capa, ...visible, ...hidden].map((img, i) => ({ ...img, ordem: i }));
}

/** Drag & drop apenas dentro da zona 1 (visíveis sem capa). Drop fora → sem mudança. */
export function applyDragReorder<T extends ImagemOrdenavel>(
  images: T[],
  activeId: string,
  overId: string,
): T[] {
  const zone1Ids = new Set(images.filter((i) => i.visivel_site && !i.is_capa).map((i) => i.id));
  if (!zone1Ids.has(activeId) || !zone1Ids.has(overId)) return images;

  const sorted = [...images].sort((a, b) => a.ordem - b.ordem);
  const oldIndex = sorted.findIndex((i) => i.id === activeId);
  const newIndex = sorted.findIndex((i) => i.id === overId);
  const result = [...sorted];
  const [moved] = result.splice(oldIndex, 1);
  result.splice(newIndex, 0, moved);
  return result.map((img, i) => ({ ...img, ordem: i }));
}

/** Persiste ordem, is_capa e visivel_site de todas as imagens no banco. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function persistOrder(supabase: any, images: ImagemOrdenavel[]): Promise<void> {
  await Promise.all(
    images.map((img) =>
      supabase
        .from("galpao_imagens")
        .update({ ordem: img.ordem, is_capa: img.is_capa, visivel_site: img.visivel_site })
        .eq("id", img.id),
    ),
  );
}
