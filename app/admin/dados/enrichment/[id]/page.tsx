"use client";

import { useParams, useRouter } from "next/navigation";
import { useRef } from "react";
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { useEnrichmentCard } from "../_hooks/useEnrichmentCard";
import PropertyPanel from "../_components/PropertyPanel";
import EnrichmentMap from "../_components/EnrichmentMap";

const PIN_COLORS = ["#d97706", "#16a34a", "#2563eb", "#7c3aed", "#dc2626", "#6b7280"];

export default function EnrichmentWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, loading, saving, createEvent, undoEvent, finalize, discard, lastEvent } =
    useEnrichmentCard(id);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  if (loading || !state) {
    return (
      <div className="text-sm text-gray-400 py-12 text-center">
        Carregando workspace...
      </div>
    );
  }

  const { card, registro, similares, stats } = state;
  const isDone = card.status === "concluido" || card.status === "descartado";

  // Build map pins
  const pins = [
    {
      lat: Number(registro.atual.latitude) || 0,
      lng: Number(registro.atual.longitude) || 0,
      label: "Novo",
      color: PIN_COLORS[0],
    },
    ...similares.map((s, i) => ({
      lat: Number(s.atual.latitude) || 0,
      lng: Number(s.atual.longitude) || 0,
      label: `#${s.rank} (${Math.round(s.score * 100)}%)`,
      color: PIN_COLORS[(i + 1) % PIN_COLORS.length],
    })),
  ];

  // Handle drag end: transfer field from source to target
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !active.data.current) return;

    const dragData = active.data.current as {
      campo: string;
      valor: unknown;
      dragId: string;
    };

    const [srcType, srcId] = (active.id as string).split(":");
    const [dstType, dstId] = (over.id as string).split(":");

    // Don't drop on self
    if (srcType === dstType && srcId === dstId) return;

    // Find the current value of the destination field
    let dstCurrentValue: unknown = undefined;
    if (dstType === "registro") {
      dstCurrentValue = registro.atual[dragData.campo];
    } else {
      const sim = similares.find((s) => s.imovel_id === dstId);
      if (sim) dstCurrentValue = sim.atual[dragData.campo];
    }

    createEvent({
      tipo: "transferir",
      campo: dragData.campo,
      valor_novo: dragData.valor,
      valor_anterior: dstCurrentValue,
      origem_tipo: srcType,
      origem_id: srcId,
      destino_tipo: dstType,
      destino_id: dstId,
    });
  }

  function handleEdit(entityType: string, entityId: string) {
    return (campo: string, novoValor: string) => {
      let currentValue: unknown;
      if (entityType === "registro") {
        currentValue = registro.atual[campo];
      } else {
        const sim = similares.find((s) => s.imovel_id === entityId);
        if (sim) currentValue = sim.atual[campo];
      }

      // Try to parse as number if it looks like one
      let parsed: unknown = novoValor;
      const num = Number(novoValor.replace(",", "."));
      if (!isNaN(num) && novoValor.trim() !== "") parsed = num;

      createEvent({
        tipo: "editar",
        campo,
        valor_novo: parsed,
        valor_anterior: currentValue,
        origem_tipo: "manual",
        destino_tipo: entityType,
        destino_id: entityId,
      });
    };
  }

  function handlePinClick(index: number) {
    if (index === 0) return; // novo, already on top
    // Scroll to the similar panel
    const el = bottomRef.current?.children[index - 1];
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center" });
  }

  const titulo =
    (registro.atual.titulo as string) ||
    [registro.atual.logradouro, registro.atual.numero]
      .filter(Boolean)
      .join(", ") ||
    "Sem endereço";

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/admin/dados/enrichment")}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              ← Voltar
            </button>
            <h1 className="text-lg font-semibold text-gray-900 mt-1">
              {titulo}
            </h1>
            <p className="text-xs text-gray-400">
              {registro.atual.cidade as string ?? ""}{" "}
              {card.score_max ? `· Top: ${Math.round(card.score_max * 100)}%` : ""}
              {` · ${stats.active_events} alteraç${stats.active_events !== 1 ? "ões" : "ão"}`}
            </p>
          </div>
          {isDone && (
            <span className={`text-xs px-2 py-1 font-medium ${
              card.status === "concluido" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
              {card.status === "concluido" ? "Concluído" : "Descartado"}
            </span>
          )}
        </div>

        {/* Top block: New property */}
        <div className="grid grid-cols-3 gap-3 border border-gray-200 bg-white p-3">
          {/* Images */}
          <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center rounded-sm">
            <span className="text-xs text-gray-400">Sem imagens</span>
          </div>

          {/* Ficha técnica (drop zone, draggable fields, no images) */}
          <PropertyPanel
            entityType="registro"
            entityId={registro.id}
            data={registro.atual}
            changes={registro.changes}
            showImages={false}
            label="Novo"
            badge="★ Novo"
            badgeColor="bg-amber-100 text-amber-700"
            onEdit={isDone ? undefined : handleEdit("registro", registro.id)}
          />

          {/* Map */}
          <div className="min-h-[250px]">
            <EnrichmentMap pins={pins} onPinClick={handlePinClick} />
          </div>
        </div>

        {/* Bottom block: Similar properties */}
        <div className="border border-gray-200 bg-white p-3">
          <div className="text-xs font-medium text-gray-500 mb-2">
            {similares.length} imóveis similares
          </div>
          <div
            ref={bottomRef}
            className="flex gap-3 overflow-x-auto pb-2"
          >
            {similares.map((sim) => (
              <PropertyPanel
                key={sim.imovel_id}
                entityType="imovel"
                entityId={sim.imovel_id}
                data={sim.atual}
                changes={sim.changes}
                images={sim.imagens}
                label={`#${sim.rank} — ${(sim.atual.logradouro as string) ?? "Sem rua"}`}
                badge={`${Math.round(sim.score * 100)}%`}
                badgeColor={
                  sim.score >= 0.75
                    ? "bg-green-100 text-green-700"
                    : sim.score >= 0.5
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-500"
                }
                onEdit={isDone ? undefined : handleEdit("imovel", sim.imovel_id)}
              />
            ))}
            {similares.length === 0 && (
              <div className="text-xs text-gray-400 py-8 text-center w-full">
                Nenhum imóvel similar encontrado
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        {!isDone && (
          <div className="flex items-center gap-3 border border-gray-200 bg-white px-4 py-3">
            <button
              onClick={() => finalize(true)}
              disabled={saving}
              className="text-sm px-4 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            >
              Criar Imóvel
            </button>
            <button
              onClick={() => finalize(false)}
              disabled={saving}
              className="text-sm px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              title="Aplica alterações nos similares sem criar novo imóvel"
            >
              Só Enriquecer
            </button>
            <button
              onClick={discard}
              disabled={saving}
              className="text-sm px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 transition-colors font-medium disabled:opacity-50"
            >
              Descartar
            </button>
            {lastEvent && (
              <button
                onClick={() => undoEvent(lastEvent.id)}
                disabled={saving}
                className="text-sm px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 ml-auto"
              >
                ↩ Desfazer
              </button>
            )}
            <span className="text-xs text-gray-400 ml-auto">
              {stats.active_events} alteraç{stats.active_events !== 1 ? "ões" : "ão"}
            </span>
          </div>
        )}
      </div>

      <DragOverlay>
        {/* Visual feedback during drag */}
        <div className="bg-white border border-blue-400 shadow-lg px-3 py-1.5 text-xs text-blue-700 font-medium rounded">
          Arrastando campo...
        </div>
      </DragOverlay>
    </DndContext>
  );
}
