"use client";

import { useDraggable } from "@dnd-kit/core";

const FIELD_LABELS: Record<string, string> = {
  titulo: "Título",
  tipo: "Tipo",
  cidade: "Cidade",
  bairro: "Bairro",
  logradouro: "Logradouro",
  numero: "Número",
  complemento: "Complemento",
  endereco: "Endereço",
  uf: "UF",
  cep: "CEP",
  area_total_m2: "Área Total",
  area_construida_m2: "Área Construída",
  area_piso_m2: "Área de Piso",
  area_escritorio_m2: "Área Escritório",
  pe_direito_m: "Pé Direito",
  numero_docas: "Docas",
  vagas_estacionamento: "Vagas",
  potencia_eletrica_kva: "Pot. Elétrica",
  valor: "Valor",
  valor_condominio: "Condomínio",
  valor_locacao: "Locação",
  valor_venda: "Venda",
  observacoes: "Observações",
  status: "Status",
  descricao: "Descrição",
  proprietario_nome: "Proprietário",
  proprietario_telefone: "Telefone",
  proprietario_email: "Email",
  latitude: "Latitude",
  longitude: "Longitude",
};

function fmtValue(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number")
    return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  return String(v);
}

type Props = {
  /** Unique ID for drag: "registro:{reg_id}:{campo}" or "imovel:{imovel_id}:{campo}" */
  dragId: string;
  campo: string;
  valor: unknown;
  changed?: { from: unknown; to: unknown; source: string } | null;
  onEdit?: (campo: string, novoValor: string) => void;
};

export default function DraggableField({
  dragId,
  campo,
  valor,
  changed,
  onEdit,
}: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { campo, valor, dragId },
  });

  function handleDoubleClick() {
    if (!onEdit) return;
    const current = fmtValue(valor);
    const novo = prompt(`Editar ${FIELD_LABELS[campo] ?? campo}:`, current === "—" ? "" : current);
    if (novo !== null && novo !== current) {
      onEdit(campo, novo);
    }
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onDoubleClick={handleDoubleClick}
      className={`flex items-center gap-2 px-2 py-1 text-xs border-b border-gray-100 cursor-grab active:cursor-grabbing select-none transition-colors ${
        isDragging
          ? "opacity-50 bg-blue-50"
          : changed
            ? "bg-amber-50 border-l-2 border-l-amber-400"
            : "hover:bg-gray-50"
      }`}
      title={changed ? `Alterado de: ${fmtValue(changed.from)} — Origem: ${changed.source}` : `Duplo-clique para editar`}
    >
      <span className="text-gray-500 w-28 shrink-0 truncate">
        {FIELD_LABELS[campo] ?? campo}
      </span>
      <span className={`flex-1 truncate ${changed ? "text-amber-700 font-medium" : "text-gray-900"}`}>
        {fmtValue(valor)}
      </span>
      {changed && (
        <span className="text-[9px] text-amber-500 shrink-0">●</span>
      )}
    </div>
  );
}
