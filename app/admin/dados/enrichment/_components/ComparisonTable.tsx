"use client";

import type { EnrichmentCardSummary } from "../_hooks/useEnrichmentCards";

const COLUMNS = [
  { key: "logradouro", label: "Rua" },
  { key: "numero", label: "Nº" },
  { key: "cidade", label: "Cidade" },
  { key: "area_total_m2", label: "Área m²" },
  { key: "area_construida_m2", label: "Constr. m²" },
  { key: "pe_direito_m", label: "PD m" },
  { key: "numero_docas", label: "Docas" },
] as const;

function fmt(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number")
    return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return String(v);
}

type Props = {
  card: EnrichmentCardSummary;
  selectedIndex: number;
  onSelectRow: (index: number) => void;
};

export default function ComparisonTable({
  card,
  selectedIndex,
  onSelectRow,
}: Props) {
  const rows = [
    { label: "Novo", data: card.registro_snapshot, isNew: true },
    ...card.similares.map((s, i) => ({
      label: `#${i + 1} (${Math.round(s.score * 100)}%)`,
      data: s.snapshot,
      isNew: false,
    })),
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-2 py-1.5 text-left font-medium text-gray-500 w-20">
              &nbsp;
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="px-2 py-1.5 text-left font-medium text-gray-500"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              onClick={() => onSelectRow(idx)}
              className={`border-b border-gray-100 cursor-pointer transition-colors ${
                idx === selectedIndex
                  ? "bg-blue-50"
                  : row.isNew
                    ? "bg-amber-50/50"
                    : "hover:bg-gray-50"
              }`}
            >
              <td className="px-2 py-1.5 font-medium text-gray-600 whitespace-nowrap">
                {row.isNew ? (
                  <span className="text-amber-600">★ Novo</span>
                ) : (
                  <span className="text-gray-400">{row.label}</span>
                )}
              </td>
              {COLUMNS.map((col) => (
                <td
                  key={col.key}
                  className="px-2 py-1.5 text-gray-700 whitespace-nowrap"
                >
                  {fmt(row.data[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
