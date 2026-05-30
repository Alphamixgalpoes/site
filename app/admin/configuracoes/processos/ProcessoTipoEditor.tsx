"use client";

import { useState } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { arrayMove } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase-browser";
import CategoriaEditor from "./CategoriaEditor";
import type { TipoTemplate, CategoriaTemplate, ItemTemplate } from "./page";

type Props = {
  tipo: TipoTemplate;
  onUpdate: (id: string, changes: Partial<TipoTemplate>) => void;
  onDelete: (id: string) => void;
};

export default function ProcessoTipoEditor({ tipo, onUpdate, onDelete }: Props) {
  const [categorias, setCategorias] = useState<CategoriaTemplate[]>(tipo.categorias);
  const [aberto, setAberto] = useState(true);
  const [editandoLabel, setEditandoLabel] = useState(false);
  const [label, setLabel] = useState(tipo.label);
  const [novaCategLabel, setNovaCategLabel] = useState("");
  const [adicionandoCateg, setAdicionandoCateg] = useState(false);
  const [mostrarFormCateg, setMostrarFormCateg] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tipo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  async function salvarLabel() {
    const val = label.trim();
    if (!val || val === tipo.label) { setEditandoLabel(false); return; }
    const supabase = createClient();
    await supabase.from("processo_tipos").update({ label: val }).eq("id", tipo.id);
    onUpdate(tipo.id, { label: val });
    setEditandoLabel(false);
  }

  async function deletarTipo() {
    const totalItens = categorias.reduce((acc, c) => acc + c.itens.length, 0);
    if (!window.confirm(
      `Excluir o tipo "${tipo.label}"?\n\nIsso vai remover ${categorias.length} categorias e ${totalItens} itens do template.\nProcessos já criados com este tipo NÃO serão afetados.\n\nEsta ação não pode ser desfeita.`
    )) return;
    const supabase = createClient();
    await supabase.from("processo_tipos").delete().eq("id", tipo.id);
    onDelete(tipo.id);
  }

  async function toggleAtivo() {
    const supabase = createClient();
    await supabase.from("processo_tipos").update({ ativo: !tipo.ativo }).eq("id", tipo.id);
    onUpdate(tipo.id, { ativo: !tipo.ativo });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = categorias.findIndex((c) => c.id === active.id);
    const newIdx = categorias.findIndex((c) => c.id === over.id);
    const reordenadas = arrayMove(categorias, oldIdx, newIdx).map((c, idx) => ({ ...c, ordem: idx + 1 }));
    setCategorias(reordenadas);
    const supabase = createClient();
    await Promise.all(reordenadas.map((c) =>
      supabase.from("processo_tipo_categorias").update({ ordem: c.ordem }).eq("id", c.id)
    ));
  }

  async function adicionarCategoria() {
    if (!novaCategLabel.trim()) return;
    setAdicionandoCateg(true);
    const supabase = createClient();
    const maxOrdem = categorias.length > 0 ? Math.max(...categorias.map((c) => c.ordem)) : 0;
    const slug = novaCategLabel.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const { data } = await supabase
      .from("processo_tipo_categorias")
      .insert({ tipo_id: tipo.id, slug, label: novaCategLabel.trim(), ordem: maxOrdem + 1 })
      .select()
      .single();
    if (data) setCategorias((prev) => [...prev, { ...data, itens: [] }]);
    setNovaCategLabel("");
    setMostrarFormCateg(false);
    setAdicionandoCateg(false);
  }

  function handleCategoriaUpdate(catId: string, changes: Partial<CategoriaTemplate>) {
    setCategorias((prev) => prev.map((c) => c.id === catId ? { ...c, ...changes } : c));
  }

  function handleCategoriaDelete(catId: string) {
    setCategorias((prev) => prev.filter((c) => c.id !== catId));
  }

  function handleItensChange(categoriaId: string, itens: ItemTemplate[]) {
    setCategorias((prev) => prev.map((c) => c.id === categoriaId ? { ...c, itens } : c));
  }

  const totalItens = categorias.reduce((acc, c) => acc + c.itens.length, 0);

  return (
    <div ref={setNodeRef} style={style} className="border border-gray-200 bg-white">
      {/* Header do tipo */}
      <div className="flex items-center gap-3 px-4 py-3 group" title="Clique no título para editar">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing shrink-0 touch-none"
          tabIndex={-1}
        >
          ⠿
        </button>

        {editandoLabel ? (
          <input
            autoFocus
            className="flex-1 text-sm font-semibold text-gray-900 border-b border-gray-300 focus:outline-none focus:border-gray-900 bg-transparent"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={salvarLabel}
            onKeyDown={(e) => { if (e.key === "Enter") salvarLabel(); if (e.key === "Escape") { setLabel(tipo.label); setEditandoLabel(false); } }}
          />
        ) : (
          <p
            className="flex-1 text-sm font-semibold text-gray-900 cursor-text hover:text-gray-600 transition-colors"
            onClick={() => setEditandoLabel(true)}
          >
            {tipo.label}
            <span className="ml-2 text-xs font-normal text-gray-400">{tipo.slug}</span>
          </p>
        )}

        <span className="text-xs text-gray-500 shrink-0">{totalItens} itens</span>

        <button
          onClick={toggleAtivo}
          className={`text-xs px-2 py-0.5 shrink-0 transition-colors ${
            tipo.ativo ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          }`}
          title={tipo.ativo ? "Desativar tipo" : "Ativar tipo"}
        >
          {tipo.ativo ? "ativo" : "inativo"}
        </button>

        <button
          onClick={deletarTipo}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-xs shrink-0"
          title="Excluir tipo"
        >
          ✕
        </button>

        <button
          onClick={() => setAberto((v) => !v)}
          className="text-gray-400 hover:text-gray-900 transition-colors text-xs shrink-0 w-5 text-center"
        >
          {aberto ? "▲" : "▼"}
        </button>
      </div>

      {/* Conteúdo expandido */}
      {aberto && (
        <div className="border-t border-gray-100">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categorias.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-gray-100 mx-4 my-3 space-y-2">
                {categorias.map((cat) => (
                  <CategoriaEditor
                    key={cat.id}
                    categoria={cat}
                    onUpdate={handleCategoriaUpdate}
                    onDelete={handleCategoriaDelete}
                    onItensChange={handleItensChange}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Adicionar categoria */}
          <div className="px-4 pb-3">
            {mostrarFormCateg ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  className="flex-1 text-sm text-gray-900 border-b border-gray-300 focus:outline-none focus:border-gray-900 bg-transparent py-0.5"
                  placeholder="Nome da categoria..."
                  value={novaCategLabel}
                  onChange={(e) => setNovaCategLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") adicionarCategoria(); if (e.key === "Escape") { setMostrarFormCateg(false); setNovaCategLabel(""); } }}
                />
                <button
                  onClick={adicionarCategoria}
                  disabled={adicionandoCateg || !novaCategLabel.trim()}
                  className="text-xs bg-gray-900 text-white px-3 py-1 hover:bg-gray-700 transition-colors disabled:opacity-40 shrink-0"
                >
                  {adicionandoCateg ? "..." : "OK"}
                </button>
                <button onClick={() => { setMostrarFormCateg(false); setNovaCategLabel(""); }} className="text-xs text-gray-400 hover:text-gray-700">
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setMostrarFormCateg(true)}
                className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
              >
                + Nova categoria
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
