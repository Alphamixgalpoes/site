"use client";

import { useState } from "react";
import Link from "next/link";
import type { EnrichmentCardSummary } from "../_hooks/useEnrichmentCards";
import ComparisonTable from "./ComparisonTable";
import ImagePairBlock from "./ImagePairBlock";

type Props = {
  card: EnrichmentCardSummary;
};

export default function EnrichmentCardPreview({ card }: Props) {
  const [selectedRow, setSelectedRow] = useState(0);

  // Images for the selected row
  // Row 0 = new registro (no images from CSV)
  // Row 1+ = similar imóveis (images loaded in workspace, not in list preview)
  const newImages: Array<{ storage_path: string; ordem: number }> = [];
  const similarImages: Array<{ storage_path: string; ordem: number }> = [];

  const titulo =
    (card.registro_snapshot.titulo as string) ||
    [card.registro_snapshot.logradouro, card.registro_snapshot.numero]
      .filter(Boolean)
      .join(", ") ||
    "Sem endereço";

  return (
    <Link
      href={`/admin/dados/enrichment/${card.id}`}
      className="block bg-white border border-gray-200 hover:border-gray-300 transition-colors"
    >
      <div className="flex">
        {/* Image pair */}
        <div className="w-64 shrink-0 p-3" onClick={(e) => e.preventDefault()}>
          <ImagePairBlock
            newImages={newImages}
            similarImages={similarImages}
          />
        </div>

        {/* Comparison table */}
        <div
          className="flex-1 min-w-0 overflow-hidden"
          onClick={(e) => e.preventDefault()}
        >
          <div className="px-3 pt-3 pb-1 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {titulo}
            </span>
            {card.score_max != null && card.score_max > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 font-medium ${
                  card.score_max >= 0.75
                    ? "bg-green-100 text-green-700"
                    : card.score_max >= 0.5
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-500"
                }`}
              >
                Top: {Math.round(card.score_max * 100)}%
              </span>
            )}
            {card.similares.length === 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 font-medium">
                Novo
              </span>
            )}
          </div>
          <ComparisonTable
            card={card}
            selectedIndex={selectedRow}
            onSelectRow={setSelectedRow}
          />
        </div>
      </div>
    </Link>
  );
}
