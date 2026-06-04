"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type ImagemExistente = {
  id: string;
  storage_path: string;
  ordem: number;
  visivel_site: boolean;
  is_capa: boolean;
};

type Props = {
  img: ImagemExistente;
  supabaseUrl: string;
  draftSaved: boolean;
  onToggleVisibilidade: (id: string, atual: boolean) => void;
  onDefinirCapa: (id: string) => void;
  onRemove: (id: string, path: string) => void;
};

export default function SortableImageCard({
  img,
  supabaseUrl,
  draftSaved,
  onToggleVisibilidade,
  onDefinirCapa,
  onRemove,
}: Props) {
  // Apenas zona 1 (visível, não-capa) é arrastável
  const isDraggable = img.visivel_site && !img.is_capa;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: img.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: isDragging ? ("relative" as const) : undefined,
    zIndex: isDragging ? 20 : undefined,
  };

  const imgSrc = `${supabaseUrl}/storage/v1/object/public/galpoes/${img.storage_path}`;

  const visibilidadeBtn = (
    <button
      type="button"
      onClick={() => onToggleVisibilidade(img.id, img.visivel_site)}
      className={`text-[11px] px-2 py-0.5 font-medium transition-colors ${
        img.visivel_site
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      {img.visivel_site ? "No site" : "Oculta"}
    </button>
  );

  const capaBtn = draftSaved ? (
    img.is_capa ? (
      <span className="text-[11px] px-2 py-0.5 bg-[#2e3092] text-white">★ Capa</span>
    ) : (
      <button
        type="button"
        onClick={() => onDefinirCapa(img.id)}
        className="text-[11px] px-2 py-0.5 border border-gray-300 text-gray-600 hover:border-gray-500 transition-colors"
      >
        Definir capa
      </button>
    )
  ) : null;

  const excluirBtn = (
    <button
      type="button"
      onClick={() => onRemove(img.id, img.storage_path)}
      className="text-[11px] px-2 py-0.5 text-red-500 hover:bg-red-50 transition-colors"
    >
      Excluir
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>

      {/* ── Mobile: linha horizontal (coluna única) ── */}
      <div className="flex items-stretch border border-gray-200 sm:hidden">
        {/* Handle de drag (só zona 1) */}
        {isDraggable ? (
          <button
            {...attributes}
            {...listeners}
            tabIndex={-1}
            className="px-2.5 flex items-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none bg-gray-50 border-r border-gray-200 shrink-0 select-none"
          >
            ⠿
          </button>
        ) : (
          <div className="w-2 bg-gray-50 border-r border-gray-200 shrink-0" />
        )}

        {/* Thumbnail */}
        <div className="relative w-[72px] shrink-0 bg-gray-100 self-stretch">
          <img
            src={imgSrc}
            alt=""
            className={`w-full h-full object-cover ${img.visivel_site ? "opacity-100" : "opacity-40"}`}
          />
          {img.is_capa && (
            <span className="absolute top-0.5 left-0.5 bg-[#2e3092] text-white text-[9px] font-bold px-1 leading-none py-0.5">
              ★
            </span>
          )}
        </div>

        {/* Controles */}
        <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2.5 min-h-[54px]">
          {visibilidadeBtn}
          {capaBtn}
          {excluirBtn}
        </div>
      </div>

      {/* ── Desktop: card vertical ── */}
      <div className="relative hidden sm:block border border-gray-200 overflow-hidden">
        {/* Overlay arrastável sobre a imagem */}
        {isDraggable && (
          <div
            {...attributes}
            {...listeners}
            className="absolute inset-x-0 top-0 z-10 cursor-grab active:cursor-grabbing select-none"
            style={{ height: "calc(100% - 76px)" }}
          />
        )}

        <div className="relative aspect-video bg-gray-100">
          <img
            src={imgSrc}
            alt=""
            className={`w-full h-full object-cover transition-opacity ${img.visivel_site ? "opacity-100" : "opacity-40"}`}
          />
          {img.is_capa && (
            <span className="absolute top-1.5 left-1.5 bg-[#2e3092] text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
              CAPA
            </span>
          )}
          {!img.visivel_site && (
            <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 leading-none">
              Oculta
            </span>
          )}
          {isDraggable && (
            <span className="absolute top-1.5 right-1.5 text-white/50 text-sm select-none pointer-events-none">
              ⠿
            </span>
          )}
        </div>

        <div className="p-2 space-y-1.5">
          <button
            type="button"
            onClick={() => onToggleVisibilidade(img.id, img.visivel_site)}
            className={`w-full text-[11px] py-1 font-medium transition-colors ${
              img.visivel_site
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {img.visivel_site ? "No site" : "Oculta"}
          </button>
          {draftSaved && (
            <button
              type="button"
              onClick={() => !img.is_capa && onDefinirCapa(img.id)}
              disabled={img.is_capa}
              className={`w-full text-[11px] py-1 transition-colors ${
                img.is_capa
                  ? "bg-[#2e3092] text-white cursor-default"
                  : "border border-gray-300 text-gray-600 hover:border-gray-500"
              }`}
            >
              {img.is_capa ? "★ Capa" : "Definir capa"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(img.id, img.storage_path)}
            className="w-full text-[11px] py-1 text-red-500 hover:bg-red-50 transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>

    </div>
  );
}
