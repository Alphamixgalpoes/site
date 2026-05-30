"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase-browser";

type Processo = {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  parte_a: string | null;
  parte_b: string | null;
  valor: number | null;
  notas: string | null;
};

type Item = {
  id: string;
  categoria: string;
  titulo: string;
  descricao: string | null;
  feito: boolean;
  ordem: number;
  arquivo_path: string | null;
  arquivo_nome: string | null;
  arquivo_tipo: string | null;
};

type Categoria = {
  id: string;
  slug: string;
  label: string;
  ordem: number;
};

const statusOpcoes = [
  { value: "em_andamento", label: "Em andamento" },
  { value: "pausado", label: "Pausado" },
  { value: "concluido", label: "Concluído" },
];

const tipoLabel: Record<string, string> = {
  venda: "Venda",
  locacao: "Locação",
  regularizacao: "Regularização",
};

const inp = "border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 bg-white w-full placeholder:text-gray-300";
const ACCEPTED = ".pdf,.png,.jpg,.jpeg";
const MAX_MB = 10;

// Componente de item arrastável
function ItemRow({
  item, onToggle, onRemove, onUpload, onRemoverArquivo, signedUrl, uploading,
}: {
  item: Item;
  onToggle: (item: Item) => void;
  onRemove: (id: string) => void;
  onUpload: (item: Item, file: File) => void;
  onRemoverArquivo: (item: Item) => void;
  signedUrl?: string;
  uploading?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 px-4 py-3 group bg-white"
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

      <button
        onClick={() => onToggle(item)}
        className={`mt-0.5 w-4 h-4 shrink-0 border transition-colors flex items-center justify-center ${
          item.feito ? "bg-gray-900 border-gray-900" : "border-gray-300 hover:border-gray-500"
        }`}
      >
        {item.feito && <span className="text-white text-xs leading-none">✓</span>}
      </button>

      <div className={`flex-1 min-w-0 ${item.feito ? "opacity-40" : ""}`}>
        <p className={`text-sm text-gray-900 ${item.feito ? "line-through" : ""}`}>{item.titulo}</p>
        {item.descricao && (
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.descricao}</p>
        )}

        {/* Arquivo */}
        <div className="mt-2">
          {item.arquivo_nome ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 truncate max-w-[200px]">
                {item.arquivo_tipo === "pdf" ? "PDF" : "IMG"} · {item.arquivo_nome}
              </span>
              {signedUrl && (
                <a href={signedUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-gray-900 transition-colors" title="Abrir">
                  ↗
                </a>
              )}
              <button onClick={() => onRemoverArquivo(item)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors" title="Remover arquivo">
                ✕
              </button>
            </div>
          ) : (
            <>
              <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(item, f); e.target.value = ""; }}
              />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="text-xs text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-40">
                {uploading ? "Enviando..." : "+ Anexar"}
              </button>
            </>
          )}
        </div>
      </div>

      <button onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-xs shrink-0 mt-0.5">
        ✕
      </button>
    </div>
  );
}

export default function ProcessoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  // novo item
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const [mostrarFormItem, setMostrarFormItem] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => { load(); }, [id]);

  async function load() {
    const supabase = createClient();
    const [{ data: proc }, { data: its }, { data: cats }] = await Promise.all([
      supabase.from("processos").select("*").eq("id", id).single(),
      supabase.from("processo_itens").select("*").eq("processo_id", id).order("ordem"),
      supabase.from("processo_categorias").select("*").eq("processo_id", id).order("ordem"),
    ]);
    setProcesso(proc);
    const items = its ?? [];
    setItens(items);

    // Categorias: usa DB se existir, senão deriva dos slugs únicos dos itens
    if (cats && cats.length > 0) {
      setCategorias(cats);
      setNovaCategoria(cats[0]?.slug ?? "");
    } else {
      const slugsUnicos = Array.from(new Set((its ?? []).map((i) => i.categoria)));
      const catsDerivadas: Categoria[] = slugsUnicos.map((slug, idx) => ({
        id: slug,
        slug,
        label: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, " "),
        ordem: idx + 1,
      }));
      setCategorias(catsDerivadas);
      setNovaCategoria(catsDerivadas[0]?.slug ?? "");
    }

    setLoading(false);
    await loadSignedUrls(items);
  }

  async function loadSignedUrls(items: Item[]) {
    const comArquivo = items.filter((i) => i.arquivo_path);
    if (comArquivo.length === 0) return;
    const supabase = createClient();
    const urls: Record<string, string> = {};
    await Promise.all(comArquivo.map(async (item) => {
      const { data } = await supabase.storage.from("processos").createSignedUrl(item.arquivo_path!, 3600);
      if (data?.signedUrl) urls[item.id] = data.signedUrl;
    }));
    setSignedUrls(urls);
  }

  async function toggleFeito(item: Item) {
    setItens((prev) => prev.map((i) => i.id === item.id ? { ...i, feito: !item.feito } : i));
    const supabase = createClient();
    await supabase.from("processo_itens").update({ feito: !item.feito }).eq("id", item.id);
  }

  async function atualizarStatus(status: string) {
    setProcesso((p) => p ? { ...p, status } : p);
    const supabase = createClient();
    await supabase.from("processos").update({ status }).eq("id", id);
  }

  async function adicionarItem() {
    if (!novoTitulo.trim() || !novaCategoria) return;
    setAdicionando(true);
    const supabase = createClient();
    const maxOrdem = Math.max(0, ...itens.filter((i) => i.categoria === novaCategoria).map((i) => i.ordem));
    const { data } = await supabase
      .from("processo_itens")
      .insert({ processo_id: id, categoria: novaCategoria, titulo: novoTitulo.trim(), ordem: maxOrdem + 1 })
      .select()
      .single();
    if (data) setItens((prev) => [...prev, data]);
    setNovoTitulo("");
    setMostrarFormItem(false);
    setAdicionando(false);
  }

  async function removerItem(itemId: string) {
    const item = itens.find((i) => i.id === itemId);
    if (item?.arquivo_path) {
      const supabase = createClient();
      await supabase.storage.from("processos").remove([item.arquivo_path]);
    }
    setItens((prev) => prev.filter((i) => i.id !== itemId));
    const supabase = createClient();
    await supabase.from("processo_itens").delete().eq("id", itemId);
  }

  async function handleUpload(item: Item, file: File) {
    if (file.size > MAX_MB * 1024 * 1024) { alert(`Máximo ${MAX_MB}MB`); return; }
    setUploading((prev) => ({ ...prev, [item.id]: true }));
    const supabase = createClient();
    if (item.arquivo_path) await supabase.storage.from("processos").remove([item.arquivo_path]);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${id}/${item.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("processos").upload(path, file, { upsert: true });
    if (error) { alert("Erro no upload."); setUploading((prev) => ({ ...prev, [item.id]: false })); return; }
    const tipo = ext === "pdf" ? "pdf" : "imagem";
    await supabase.from("processo_itens").update({ arquivo_path: path, arquivo_nome: file.name, arquivo_tipo: tipo, feito: true }).eq("id", item.id);
    const { data: signed } = await supabase.storage.from("processos").createSignedUrl(path, 3600);
    setItens((prev) => prev.map((i) => i.id === item.id ? { ...i, arquivo_path: path, arquivo_nome: file.name, arquivo_tipo: tipo, feito: true } : i));
    if (signed?.signedUrl) setSignedUrls((prev) => ({ ...prev, [item.id]: signed.signedUrl }));
    setUploading((prev) => ({ ...prev, [item.id]: false }));
  }

  async function handleRemoverArquivo(item: Item) {
    if (!item.arquivo_path) return;
    const supabase = createClient();
    await supabase.storage.from("processos").remove([item.arquivo_path]);
    await supabase.from("processo_itens").update({ arquivo_path: null, arquivo_nome: null, arquivo_tipo: null }).eq("id", item.id);
    setItens((prev) => prev.map((i) => i.id === item.id ? { ...i, arquivo_path: null, arquivo_nome: null, arquivo_tipo: null } : i));
    setSignedUrls((prev) => { const n = { ...prev }; delete n[item.id]; return n; });
  }

  // Reordenar itens dentro de uma categoria
  async function handleDragEndItens(event: DragEndEvent, catSlug: string) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const itensCat = itens.filter((i) => i.categoria === catSlug);
    const oldIdx = itensCat.findIndex((i) => i.id === active.id);
    const newIdx = itensCat.findIndex((i) => i.id === over.id);
    const reordenados = arrayMove(itensCat, oldIdx, newIdx).map((i, idx) => ({ ...i, ordem: idx + 1 }));
    setItens((prev) => {
      const outros = prev.filter((i) => i.categoria !== catSlug);
      return [...outros, ...reordenados].sort((a, b) => a.ordem - b.ordem);
    });
    const supabase = createClient();
    await Promise.all(reordenados.map((i) =>
      supabase.from("processo_itens").update({ ordem: i.ordem }).eq("id", i.id)
    ));
  }

  // Reordenar categorias
  async function handleDragEndCategorias(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = categorias.findIndex((c) => c.id === active.id);
    const newIdx = categorias.findIndex((c) => c.id === over.id);
    const reordenadas = arrayMove(categorias, oldIdx, newIdx).map((c, idx) => ({ ...c, ordem: idx + 1 }));
    setCategorias(reordenadas);
    // Só persiste se existir no banco (não nas derivadas)
    const supabase = createClient();
    const { data: existentes } = await supabase.from("processo_categorias").select("id").eq("processo_id", id);
    if (existentes && existentes.length > 0) {
      await Promise.all(reordenadas.map((c) =>
        supabase.from("processo_categorias").update({ ordem: c.ordem }).eq("id", c.id)
      ));
    }
  }

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>;
  if (!processo) return <div className="text-sm text-gray-400 py-12 text-center">Processo não encontrado.</div>;

  const total = itens.length;
  const feitos = itens.filter((i) => i.feito).length;
  const progresso = total > 0 ? Math.round((feitos / total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/admin/processos" className="hover:text-gray-900 transition-colors">Processos</Link>
        <span>/</span>
        <span className="text-gray-700 truncate">{processo.titulo}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{tipoLabel[processo.tipo] ?? processo.tipo}</p>
            <h1 className="text-lg font-semibold text-gray-900">{processo.titulo}</h1>
            {(processo.parte_a || processo.parte_b) && (
              <p className="text-sm text-gray-500 mt-1">{[processo.parte_a, processo.parte_b].filter(Boolean).join(" → ")}</p>
            )}
            {processo.valor && (
              <p className="text-sm text-gray-500 mt-0.5">R$ {Number(processo.valor).toLocaleString("pt-BR")}</p>
            )}
          </div>
          <select value={processo.status} onChange={(e) => atualizarStatus(e.target.value)}
            className="border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-gray-900 bg-white shrink-0">
            {statusOpcoes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {processo.notas && (
          <p className="text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">{processo.notas}</p>
        )}

        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">Progresso</p>
            <p className="text-xs font-medium text-gray-700">{feitos} / {total} itens concluídos</p>
          </div>
          <div className="w-full bg-gray-100 h-1.5">
            <div className="bg-gray-900 h-1.5 transition-all duration-300" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      </div>

      {/* Categorias com DnD */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCategorias}>
        <SortableContext items={categorias.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {categorias.map((cat) => {
              const itensCat = itens.filter((i) => i.categoria === cat.slug).sort((a, b) => a.ordem - b.ordem);
              return (
                <CategoriaDragRow
                  key={cat.id}
                  id={cat.id}
                  label={cat.label}
                >
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEndItens(e, cat.slug)}
                  >
                    <SortableContext items={itensCat.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="bg-white border border-gray-200 divide-y divide-gray-100">
                        {itensCat.map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            onToggle={toggleFeito}
                            onRemove={removerItem}
                            onUpload={handleUpload}
                            onRemoverArquivo={handleRemoverArquivo}
                            signedUrl={signedUrls[item.id]}
                            uploading={uploading[item.id]}
                          />
                        ))}
                        {itensCat.length === 0 && (
                          <div className="px-4 py-3 text-xs text-gray-400">Nenhum item nesta categoria.</div>
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                </CategoriaDragRow>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Adicionar item */}
      <div>
        {mostrarFormItem ? (
          <div className="bg-white border border-gray-200 p-4 space-y-3">
            <select
              className="border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-gray-900 bg-white"
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
            >
              {categorias.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
            <input
              className={inp}
              placeholder="Título do item..."
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && adicionarItem()}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={adicionarItem} disabled={adicionando || !novoTitulo.trim()}
                className="bg-gray-900 text-white px-4 py-1.5 text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-40">
                {adicionando ? "Adicionando..." : "Adicionar"}
              </button>
              <button onClick={() => { setMostrarFormItem(false); setNovoTitulo(""); }}
                className="text-xs text-gray-400 hover:text-gray-900 transition-colors px-2">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setMostrarFormItem(true)}
            className="text-sm text-gray-400 hover:text-gray-900 transition-colors">
            + Adicionar item
          </button>
        )}
      </div>

    </div>
  );
}

// Header da categoria com drag handle
function CategoriaDragRow({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2 mb-3">
        <button {...attributes} {...listeners}
          className="text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing touch-none"
          tabIndex={-1}>
          ⠿
        </button>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
      </div>
      {children}
    </div>
  );
}
