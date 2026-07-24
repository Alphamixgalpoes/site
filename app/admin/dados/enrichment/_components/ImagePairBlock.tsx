"use client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

type Props = {
  /** Images from the new registro (usually empty for CSV data) */
  newImages: Array<{ storage_path: string; ordem: number }>;
  /** Images from the selected similar imovel */
  similarImages: Array<{ storage_path: string; ordem: number }>;
};

function ImageSlot({
  images,
  label,
}: {
  images: Array<{ storage_path: string; ordem: number }>;
  label: string;
}) {
  if (!images.length) {
    return (
      <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center border border-gray-200">
        <span className="text-xs text-gray-400">{label} — Sem imagens</span>
      </div>
    );
  }

  const src = `${SUPABASE_URL}/storage/v1/object/public/galpoes/${images[0].storage_path}`;

  return (
    <div className="w-full aspect-[4/3] bg-gray-100 border border-gray-200 overflow-hidden">
      <img
        src={src}
        alt={label}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

export default function ImagePairBlock({ newImages, similarImages }: Props) {
  return (
    <div className="flex gap-2">
      <div className="w-1/2">
        <ImageSlot images={newImages} label="Novo" />
      </div>
      <div className="w-1/2">
        <ImageSlot images={similarImages} label="Similar" />
      </div>
    </div>
  );
}
