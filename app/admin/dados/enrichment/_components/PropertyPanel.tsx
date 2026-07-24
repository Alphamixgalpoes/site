"use client";

import { useDroppable } from "@dnd-kit/core";
import DraggableField from "./DraggableField";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Fields to show in the panel, in display order
const DISPLAY_FIELDS = [
  "titulo", "tipo", "cidade", "bairro", "logradouro", "numero",
  "complemento", "endereco",
  "area_total_m2", "area_construida_m2", "area_piso_m2",
  "area_escritorio_m2", "pe_direito_m",
  "numero_docas", "vagas_estacionamento", "potencia_eletrica_kva",
  "valor", "valor_locacao", "valor_venda", "valor_condominio",
  "status", "observacoes",
  "proprietario_nome", "proprietario_telefone", "proprietario_email",
  "latitude", "longitude",
];

type Props = {
  /** "registro" or "imovel" */
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
  changes: Record<string, { from: unknown; to: unknown; source: string; event_id: string }>;
  images?: Array<{ storage_path: string; ordem: number }>;
  showImages?: boolean;
  label: string;
  badge?: string;
  badgeColor?: string;
  onEdit?: (campo: string, novoValor: string) => void;
};

export default function PropertyPanel({
  entityType,
  entityId,
  data,
  changes,
  images = [],
  showImages = true,
  label,
  badge,
  badgeColor = "bg-gray-100 text-gray-600",
  onEdit,
}: Props) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${entityType}:${entityId}`,
    data: { entityType, entityId },
  });

  // Collect all fields that have data or changes
  const fieldsToShow = DISPLAY_FIELDS.filter(
    (f) => data[f] != null || changes[f],
  );

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-sm flex flex-col min-w-[220px] transition-colors ${
        isOver ? "border-blue-400 bg-blue-50/30" : "border-gray-200"
      }`}
    >
      {/* Header */}
      <div className="px-2 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <span className="text-xs font-medium text-gray-700 truncate flex-1">
          {label}
        </span>
        {badge && (
          <span className={`text-[9px] px-1.5 py-0.5 font-semibold ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Images */}
      {showImages && (
        images.length > 0 ? (
          <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
            <img
              src={`${SUPABASE_URL}/storage/v1/object/public/galpoes/${images[0].storage_path}`}
              alt={label}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
            <span className="text-[10px] text-gray-400">Sem imagens</span>
          </div>
        )
      )}

      {/* Fields */}
      <div className="flex-1 overflow-y-auto max-h-[400px]">
        {fieldsToShow.map((campo) => (
          <DraggableField
            key={campo}
            dragId={`${entityType}:${entityId}:${campo}`}
            campo={campo}
            valor={data[campo]}
            changed={changes[campo] ?? null}
            onEdit={onEdit}
          />
        ))}
        {fieldsToShow.length === 0 && (
          <div className="px-2 py-4 text-center text-xs text-gray-400">
            Sem dados
          </div>
        )}
      </div>
    </div>
  );
}
