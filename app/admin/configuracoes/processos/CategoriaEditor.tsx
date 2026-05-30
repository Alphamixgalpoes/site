"use client";

import { useState } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { arrayMove } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase-browser";
import ItemEditor from "./ItemEditor";
import type { CategoriaTemplate, ItemTemplate } from "./page";

type Props = {
  categoria: CategoriaTemplate;
  onUpdate: (id: string, changes: Partial<CategoriaTemplate>) => void;
  onDelete: (id: string) => void;
  onItensChange: (categoriaId: string, itens: ItemTemplate[]) => void;
};

export default function CategoriaEditor({ categoria, onUpdate, onDelete, onItensChange }: Props) {
  const [itens, setItens] = useState<ItemTemplate[]>(categoria.itens);
  const [editandoLabel, setEditandoLabel] = useState(false);
  const [label, setLabel] = useState(categoria.label);
  const [novoItemTitulo, setNovoItemTitulo] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: categoria.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  async function salvarLabel() {
    const val = label.trim();
    if (!val || val === categoria.label) { setEditandoLabel(false); return; }
    const supabase = createClient();
    await supabase.from("processo_tipo_categorias").update({ label: val }).eq("id", categoria.id);
    onUpdate(categoria.id, { label: val });
    setEditandoLabel(false);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = itens.findIndex((i) => i.id === active.id);
    const newIdx = itens.findIndex((i) => i.id === over.id);
    const reordenados = arrayMove(itens, oldIdx, newIdx).map((item, idx) => ({ ...item, ordem: idx + 1 }));
    setItens(reordenados);
    onItensChange(categoria.id, reordenados);
    const supabase = createClient();
    await Promise.all(reordenados.map((item) =>
      supabase.from("processo_tipo_itens").update({ ordem: item.ordem }).eq("id", item.id)
    ));
  }

  async function adicionarItem() {
    if (!novoItemTitulo.trim()) return;
    setAdicionando(true);
    const supabase = createClient();
    const maxOrdem = itens.length > 0 ? Math.max(...itens.map((i) => i.ordem)) : 0;
    const { data } = await supabase
      .from("processo_tipo_itens")
      .insert({
        categoria_id: categoria.id,
        titulo: novoItemTitulo.trim(),
        ordem: maxOrdem + 1,
      })
      .select()
      .single();
    if (data) {
      const novosItens = [...itens, data];
      setItens(novosItens);
      onItensChange(categoria.id, novosItens);
    }
    setNovoItemTitulo("");
    setMostrarForm(false);
    setAdicionando(false);
  }

  async function deletarCategoria() {
    const supabase = createClient();
    await supabase.from("processo_tipo_categorias").delete().eq("id", categoria.id);
    onDelete(categoria.id);
  }

  function handleItemUpdate(itemId: string, changes: Partial<ItemTemplate>) {
    const atualizados = itens.map((i) => i.id === itemId ? { ...i, ...changes } : i);
    setItens(atualizados);
    onItensChange(categoria.id, atualizados);
  }

  function handleItemDelete(itemId: string) {
    const filtrados = itens.filter((i) => i.id !== itemId);
    setItens(filtrados);
    onItensChange(categoria.id, filtrados);
  }

  return (
    <div ref={setNodeRef} style={style} className="border border-gray-100 bg-white">
      {/* Header da categoria */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100 group">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 touch-none"
          tabIndex={-1}
        >
          ⠿
        </button>

        {editandoLabel ? (
          <input
            autoFocus
            className="flex-1 text-xs font-semibold text-gray-600 uppercase tracking-widest border-b border-gray-300 focus:outline-none focus:border-gray-900 bg-transparent"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={salvarLabel}
            onKeyDown={(e) => { if (e.key === "Enter") salvarLabel(); if (e.key === "Escape") { setLabel(categoria.label); setEditandoLabel(false); } }}
          />
        ) : (
          <p
            className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-widest cursor-text hover:text-gray-700 transition-colors"
            onClick={() => setEditandoLabel(true)}
          >
            {categoria.label}
          </p>
        )}

        <button
          onClick={deletarCategoria}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs shrink-0"
          title="Remover categoria"
        >
          ✕
        </button>
      </div>

      {/* Itens */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itens.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-gray-50">
            {itens.map((item) => (
              <ItemEditor
                key={item.id}
                item={item}
                onUpdate={handleItemUpdate}
                onDelete={handleItemDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Adicionar item */}
      <div className="px-4 py-2 border-t border-gray-50">
        {mostrarForm ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              className="flex-1 text-sm text-gray-900 border-b border-gray-300 focus:outline-none focus:border-gray-900 bg-transparent py-0.5"
              placeholder="Título do item..."
              value={novoItemTitulo}
              onChange={(e) => setNovoItemTitulo(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") adicionarItem(); if (e.key === "Escape") { setMostrarForm(false); setNovoItemTitulo(""); } }}
            />
            <button
              onClick={adicionarItem}
              disabled={adicionando || !novoItemTitulo.trim()}
              className="text-xs bg-gray-900 text-white px-3 py-1 hover:bg-gray-700 transition-colors disabled:opacity-40 shrink-0"
            >
              {adicionando ? "..." : "OK"}
            </button>
            <button onClick={() => { setMostrarForm(false); setNovoItemTitulo(""); }} className="text-xs text-gray-400 hover:text-gray-700">
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setMostrarForm(true)}
            className="text-xs text-gray-300 hover:text-gray-600 transition-colors"
          >
            + Novo item
          </button>
        )}
      </div>
    </div>
  );
}
