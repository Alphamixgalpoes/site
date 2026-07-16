"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiPut, apiDelete } from "@/lib/api-client";
import type { ItemTemplate } from "./page";

type Props = {
  item: ItemTemplate;
  onUpdate: (id: string, changes: Partial<ItemTemplate>) => void;
  onDelete: (id: string) => void;
};

export default function ItemEditor({ item, onUpdate, onDelete }: Props) {
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [editandoDesc, setEditandoDesc] = useState(false);
  const [titulo, setTitulo] = useState(item.titulo);
  const [descricao, setDescricao] = useState(item.descricao ?? "");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  async function salvarTitulo() {
    const val = titulo.trim();
    if (!val || val === item.titulo) { setEditandoTitulo(false); return; }
    await apiPut(`/api/v1/config/itens/${item.id}`, { titulo: val }, { auth: true });
    onUpdate(item.id, { titulo: val });
    setEditandoTitulo(false);
  }

  async function salvarDescricao() {
    const val = descricao.trim() || null;
    if (val === item.descricao) { setEditandoDesc(false); return; }
    await apiPut(`/api/v1/config/itens/${item.id}`, { descricao: val }, { auth: true });
    onUpdate(item.id, { descricao: val });
    setEditandoDesc(false);
  }

  async function deletar() {
    if (!window.confirm(`Excluir o item "${item.titulo}"?`)) return;
    await apiDelete(`/api/v1/config/itens/${item.id}`, { auth: true });
    onDelete(item.id);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 px-4 py-2.5 group bg-white hover:bg-gray-50 transition-colors"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing shrink-0 touch-none"
        tabIndex={-1}
      >
        ⠿
      </button>

      <div className="flex-1 min-w-0 space-y-0.5">
        {editandoTitulo ? (
          <input
            autoFocus
            className="w-full text-sm text-gray-900 border-b border-gray-300 focus:outline-none focus:border-gray-900 bg-transparent py-0.5"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={salvarTitulo}
            onKeyDown={(e) => { if (e.key === "Enter") salvarTitulo(); if (e.key === "Escape") { setTitulo(item.titulo); setEditandoTitulo(false); } }}
          />
        ) : (
          <p
            className="text-sm text-gray-900 cursor-text hover:text-gray-600 transition-colors"
            onClick={() => setEditandoTitulo(true)}
          >
            {item.titulo}
          </p>
        )}

        {editandoDesc ? (
          <input
            autoFocus
            className="w-full text-xs text-gray-400 border-b border-gray-200 focus:outline-none focus:border-gray-400 bg-transparent py-0.5"
            placeholder="Descrição (opcional)..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            onBlur={salvarDescricao}
            onKeyDown={(e) => { if (e.key === "Enter") salvarDescricao(); if (e.key === "Escape") { setDescricao(item.descricao ?? ""); setEditandoDesc(false); } }}
          />
        ) : (
          <p
            className="text-xs text-gray-400 cursor-text hover:text-gray-500 transition-colors min-h-[1rem]"
            onClick={() => setEditandoDesc(true)}
          >
            {item.descricao ?? <span className="italic text-gray-300">+ descrição</span>}
          </p>
        )}
      </div>

      <button
        onClick={deletar}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-xs shrink-0 mt-0.5"
        title="Remover item"
      >
        ✕
      </button>
    </div>
  );
}
