"use client";

import { useState } from "react";

type GalleryImage = { id: string; storage_path: string };

type Props = {
  images: GalleryImage[];
  supabaseUrl: string;
  alt: string;
  initialIndex?: number;
};

export default function ImageGallery({ images, supabaseUrl, alt, initialIndex = 0 }: Props) {
  const [active, setActive] = useState(Math.min(initialIndex, Math.max(0, images.length - 1)));

  if (images.length === 0) {
    return (
      <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
        Sem imagens
      </div>
    );
  }

  const url = (img: GalleryImage) =>
    `${supabaseUrl}/storage/v1/object/public/galpoes/${img.storage_path}`;

  const prev = () => setActive((i) => (i - 1 + images.length) % images.length);
  const next = () => setActive((i) => (i + 1) % images.length);

  return (
    <div className="space-y-2">
      {/* Imagem em foco */}
      <div className="relative aspect-video bg-gray-100 overflow-hidden">
        <img
          src={url(images[active])}
          alt={alt}
          className="w-full h-full object-cover"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-9 h-9 flex items-center justify-center rounded-full text-xl leading-none transition-colors"
              aria-label="Foto anterior"
            >
              ‹
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-9 h-9 flex items-center justify-center rounded-full text-xl leading-none transition-colors"
              aria-label="Próxima foto"
            >
              ›
            </button>
            <span className="absolute bottom-2 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full tabular-nums">
              {active + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {/* Filmstrip de miniaturas */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              className={`shrink-0 w-16 h-12 overflow-hidden rounded-sm border-2 transition-colors snap-start ${
                i === active
                  ? "border-[#2e3092] opacity-100"
                  : "border-transparent opacity-60 hover:opacity-90 hover:border-gray-300"
              }`}
              aria-label={`Ver foto ${i + 1}`}
            >
              <img src={url(img)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
