"use client";

import { useState } from "react";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase-browser";
import ProcessoTipoEditor from "./ProcessoTipoEditor";
import type { TipoTemplate } from "./page";

type Props = { tiposIniciais: TipoTemplate[] };

export default function ProcessoConfigClient({ tiposIniciais }: Props) {
  const [tipos, setTipos] = useState<TipoTemplate[]>(tiposIniciais);
  const [novoSlug, setNovoSlug] = useState("");
  const [novoLabel, setNovoLabel] = useState("");
  const [criando, setCriando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = tipos.findIndex((t) => t.id === active.id);
    const newIdx = tipos.findIndex((t) => t.id === over.id);
    const reordenados = arrayMove(tipos, oldIdx, newIdx).map((t, idx) => ({ ...t, ordem: idx + 1 }));
    setTipos(reordenados);
    const supabase = createClient();
    await Promise.all(reordenados.map((t) =>
      supabase.from("processo_tipos").update({ ordem: t.ordem }).eq("id", t.id)
    ));
  }

  async function criarTipo() {
    const slug = novoSlug.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const label = novoLabel.trim();
    if (!slug || !label) return;
    setCriando(true);
    const supabase = createClient();
    const maxOrdem = tipos.length > 0 ? Math.max(...tipos.map((t) => t.ordem)) : 0;
    const { data } = await supabase
      .from("processo_tipos")
      .insert({ slug, label, ativo: true, ordem: maxOrdem + 1 })
      .select()
      .single();
    if (data) setTipos((prev) => [...prev, { ...data, categorias: [] }]);
    setNovoSlug("");
    setNovoLabel("");
    setMostrarForm(false);
    setCriando(false);
  }

  function handleTipoUpdate(id: string, changes: Partial<TipoTemplate>) {
    setTipos((prev) => prev.map((t) => t.id === id ? { ...t, ...changes } : t));
  }

  function handleTipoDelete(id: string) {
    setTipos((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tipos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tipos.map((tipo) => (
            <ProcessoTipoEditor
              key={tipo.id}
              tipo={tipo}
              onUpdate={handleTipoUpdate}
              onDelete={handleTipoDelete}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Novo tipo */}
      {mostrarForm ? (
        <div className="border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Novo tipo de processo</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Nome de exibição *</label>
              <input
                autoFocus
                className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 bg-white"
                placeholder="Ex: Permuta"
                value={novoLabel}
                onChange={(e) => setNovoLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && criarTipo()}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Slug (identificador) *</label>
              <input
                className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 bg-white"
                placeholder="Ex: permuta"
                value={novoSlug}
                onChange={(e) => setNovoSlug(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && criarTipo()}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">O slug é o identificador interno — use letras minúsculas sem espaços.</p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={criarTipo}
              disabled={criando || !novoLabel.trim() || !novoSlug.trim()}
              className="bg-gray-900 text-white px-4 py-1.5 text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-40"
            >
              {criando ? "Criando..." : "Criar tipo"}
            </button>
            <button
              onClick={() => { setMostrarForm(false); setNovoSlug(""); setNovoLabel(""); }}
              className="text-xs text-gray-400 hover:text-gray-900 transition-colors px-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setMostrarForm(true)}
          className="text-sm text-gray-400 hover:text-gray-900 transition-colors"
        >
          + Novo tipo de processo
        </button>
      )}
    </div>
  );
}
