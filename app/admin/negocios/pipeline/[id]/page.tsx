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
import ContatoPicker from "@/app/admin/_components/ContatoPicker";
import type { ContatoResumido } from "@/lib/types";

type GalpaoVinculado = {
  id: string;
  titulo: string;
  tipo: string | null;
  area_total: number | null;
};

type Processo = {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  parte_a: string | null;
  parte_b: string | null;
  proprietario_id: string | null;
  cliente_id: string | null;
  valor: number | null;
  notas: string | null;
  galpao_id: string | null;
  galpao: GalpaoVinculado | null;
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

type ContatoVinculado = {
  id: string;
  contato_id: string;
  nome: string;
  tipo_principal: string;
  papel: string;
};

type ContatoBusca = {
  id: string;
  nome: string;
  tipo_principal: string;
};

type GalpaoBusca = {
  id: string;
  titulo: string;
  tipo: string | null;
  area_total: number | null;
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

// ── Componente de item arrastável ────────────────────────────────────────────

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

// ── Página principal ─────────────────────────────────────────────────────────

export default function ProcessoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [contatosVinculados, setContatosVinculados] = useState<ContatoVinculado[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  // ── proprietário / cliente FK ──
  const [proprietarioContato, setProprietarioContato] = useState<ContatoResumido | null>(null);
  const [clienteContato, setClienteContato] = useState<ContatoResumido | null>(null);
  const [trocandoProprietario, setTrocandoProprietario] = useState(false);
  const [trocandoCliente, setTrocandoCliente] = useState(false);

  // ── edit inline ──
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [editTitulo, setEditTitulo] = useState("");
  const [editandoParteA, setEditandoParteA] = useState(false);
  const [editParteA, setEditParteA] = useState("");
  const [editandoParteB, setEditandoParteB] = useState(false);
  const [editParteB, setEditParteB] = useState("");
  const [editandoValor, setEditandoValor] = useState(false);
  const [editValor, setEditValor] = useState("");
  const [editandoNotas, setEditandoNotas] = useState(false);
  const [editNotas, setEditNotas] = useState("");

  // ── vincular contato ──
  const [mostrarFormContato, setMostrarFormContato] = useState(false);
  const [buscaContato, setBuscaContato] = useState("");
  const [resultadosContato, setResultadosContato] = useState<ContatoBusca[]>([]);
  const [contatoSelecionado, setContatoSelecionado] = useState<ContatoBusca | null>(null);
  const [papelContato, setPapelContato] = useState("");
  const [vinculandoContato, setVinculandoContato] = useState(false);

  // ── vincular galpão ──
  const [mostrarFormGalpao, setMostrarFormGalpao] = useState(false);
  const [buscaGalpao, setBuscaGalpao] = useState("");
  const [resultadosGalpao, setResultadosGalpao] = useState<GalpaoBusca[]>([]);

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
    const [{ data: proc }, { data: its }, { data: cats }, { data: pc }] = await Promise.all([
      supabase.from("processos").select(`*, proprietario:contatos!processos_proprietario_id_fkey(id, nome, empresa, tipo_principal), cliente:contatos!processos_cliente_id_fkey(id, nome, empresa, tipo_principal)`).eq("id", id).single(),
      supabase.from("processo_itens").select("*").eq("processo_id", id).order("ordem"),
      supabase.from("processo_categorias").select("*").eq("processo_id", id).order("ordem"),
      supabase.from("processo_contatos").select("id, papel, contato_id, contatos(id, nome, tipo_principal)").eq("processo_id", id),
    ]);

    if (proc) {
      // Busca galpão vinculado separadamente (evita falha de cache de schema do PostgREST)
      let galpaoVinculado: GalpaoVinculado | null = null;
      if (proc.galpao_id) {
        const { data: g } = await supabase
          .from("galpoes")
          .select("id, titulo, tipo, area_total")
          .eq("id", proc.galpao_id)
          .single();
        galpaoVinculado = g ?? null;
      }
      setProcesso({ ...proc, galpao: galpaoVinculado } as Processo);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((proc as any).proprietario) setProprietarioContato((proc as any).proprietario as ContatoResumido);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((proc as any).cliente) setClienteContato((proc as any).cliente as ContatoResumido);
      setEditTitulo(proc.titulo);
      setEditParteA(proc.parte_a ?? "");
      setEditParteB(proc.parte_b ?? "");
      setEditValor(proc.valor ? String(proc.valor) : "");
      setEditNotas(proc.notas ?? "");
    }

    const items = its ?? [];
    setItens(items);

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

    if (pc) {
      setContatosVinculados(
        pc
          .filter((row) => row.contatos)
          .map((row) => {
            const c = row.contatos as unknown as { id: string; nome: string; tipo_principal: string };
            return {
              id: row.id,
              contato_id: row.contato_id,
              papel: row.papel,
              nome: c.nome,
              tipo_principal: c.tipo_principal,
            };
          })
      );
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

  // ── trocar proprietário / cliente ─────────────────────────────────────────

  async function trocarProprietario(c: ContatoResumido | null) {
    setProprietarioContato(c);
    setTrocandoProprietario(false);
    const supabase = createClient();
    await supabase.from("processos").update({
      proprietario_id: c?.id ?? null,
      parte_a: c?.nome ?? processo?.parte_a ?? null,
    }).eq("id", id);
    setProcesso((p) => p ? { ...p, proprietario_id: c?.id ?? null, parte_a: c?.nome ?? p.parte_a } : p);
  }

  async function trocarCliente(c: ContatoResumido | null) {
    setClienteContato(c);
    setTrocandoCliente(false);
    const supabase = createClient();
    await supabase.from("processos").update({
      cliente_id: c?.id ?? null,
      parte_b: c?.nome ?? processo?.parte_b ?? null,
    }).eq("id", id);
    setProcesso((p) => p ? { ...p, cliente_id: c?.id ?? null, parte_b: c?.nome ?? p.parte_b } : p);
  }

  // ── salvar campo inline ───────────────────────────────────────────────────

  async function salvarCampo(campo: string, valor: string | number | null) {
    const supabase = createClient();
    await supabase.from("processos").update({ [campo]: valor }).eq("id", id);
    setProcesso((p) => p ? { ...p, [campo]: valor } : p);
  }

  // ── status ────────────────────────────────────────────────────────────────

  async function atualizarStatus(status: string) {
    setProcesso((p) => p ? { ...p, status } : p);
    const supabase = createClient();
    await supabase.from("processos").update({ status }).eq("id", id);
  }

  // ── checklist ─────────────────────────────────────────────────────────────

  async function toggleFeito(item: Item) {
    setItens((prev) => prev.map((i) => i.id === item.id ? { ...i, feito: !item.feito } : i));
    const supabase = createClient();
    await supabase.from("processo_itens").update({ feito: !item.feito }).eq("id", item.id);
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
    if (!window.confirm(`Excluir "${item?.titulo}"?`)) return;
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

  // ── drag ──────────────────────────────────────────────────────────────────

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

  async function handleDragEndCategorias(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = categorias.findIndex((c) => c.id === active.id);
    const newIdx = categorias.findIndex((c) => c.id === over.id);
    const reordenadas = arrayMove(categorias, oldIdx, newIdx).map((c, idx) => ({ ...c, ordem: idx + 1 }));
    setCategorias(reordenadas);
    const supabase = createClient();
    const { data: existentes } = await supabase.from("processo_categorias").select("id").eq("processo_id", id);
    if (existentes && existentes.length > 0) {
      await Promise.all(reordenadas.map((c) =>
        supabase.from("processo_categorias").update({ ordem: c.ordem }).eq("id", c.id)
      ));
    }
  }

  // ── contatos ──────────────────────────────────────────────────────────────

  async function buscarContatos(termo: string) {
    if (termo.length < 2) { setResultadosContato([]); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from("contatos")
      .select("id, nome, tipo_principal")
      .ilike("nome", `%${termo}%`)
      .eq("ativo", true)
      .limit(8);
    setResultadosContato(data ?? []);
  }

  async function vincularContato() {
    if (!contatoSelecionado || !papelContato.trim()) return;
    setVinculandoContato(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("processo_contatos")
      .insert({ processo_id: id, contato_id: contatoSelecionado.id, papel: papelContato.trim() })
      .select("id, papel, contato_id, contatos(id, nome, tipo_principal)")
      .single();
    if (data && data.contatos) {
      const c = data.contatos as unknown as { id: string; nome: string; tipo_principal: string };
      setContatosVinculados((prev) => [...prev, {
        id: data.id,
        contato_id: data.contato_id,
        papel: data.papel,
        nome: c.nome,
        tipo_principal: c.tipo_principal,
      }]);
    }
    setBuscaContato("");
    setResultadosContato([]);
    setContatoSelecionado(null);
    setPapelContato("");
    setMostrarFormContato(false);
    setVinculandoContato(false);
  }

  async function desvincularContato(pcId: string) {
    const supabase = createClient();
    await supabase.from("processo_contatos").delete().eq("id", pcId);
    setContatosVinculados((prev) => prev.filter((c) => c.id !== pcId));
  }

  // ── galpão ────────────────────────────────────────────────────────────────

  async function buscarGalpoes(termo: string) {
    if (termo.length < 2) { setResultadosGalpao([]); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from("galpoes")
      .select("id, titulo, tipo, area_total")
      .ilike("titulo", `%${termo}%`)
      .limit(8);
    setResultadosGalpao(data ?? []);
  }

  async function vincularGalpao(galpao: GalpaoBusca) {
    const supabase = createClient();
    await supabase.from("processos").update({ galpao_id: galpao.id }).eq("id", id);
    setProcesso((p) => p ? { ...p, galpao_id: galpao.id, galpao: galpao } : p);
    setBuscaGalpao("");
    setResultadosGalpao([]);
    setMostrarFormGalpao(false);
  }

  async function desvincularGalpao() {
    const supabase = createClient();
    await supabase.from("processos").update({ galpao_id: null }).eq("id", id);
    setProcesso((p) => p ? { ...p, galpao_id: null, galpao: null } : p);
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>;
  if (!processo) return <div className="text-sm text-gray-400 py-12 text-center">Processo não encontrado.</div>;

  const total = itens.length;
  const feitos = itens.filter((i) => i.feito).length;
  const progresso = total > 0 ? Math.round((feitos / total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/admin/negocios/pipeline" className="hover:text-gray-900 transition-colors">Processos</Link>
        <span>/</span>
        <span className="text-gray-700 truncate">{processo.titulo}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{tipoLabel[processo.tipo] ?? processo.tipo}</p>

            {/* Título */}
            {editandoTitulo ? (
              <input
                autoFocus
                className="text-lg font-semibold text-gray-900 border-b border-gray-300 focus:outline-none focus:border-gray-900 bg-transparent w-full"
                value={editTitulo}
                onChange={(e) => setEditTitulo(e.target.value)}
                onBlur={() => { salvarCampo("titulo", editTitulo.trim() || processo.titulo); setEditandoTitulo(false); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { salvarCampo("titulo", editTitulo.trim() || processo.titulo); setEditandoTitulo(false); }
                  if (e.key === "Escape") { setEditTitulo(processo.titulo); setEditandoTitulo(false); }
                }}
              />
            ) : (
              <h1
                className="text-lg font-semibold text-gray-900 cursor-text hover:text-gray-600 transition-colors"
                onClick={() => { setEditTitulo(processo.titulo); setEditandoTitulo(true); }}
                title="Clique para editar"
              >
                {processo.titulo}
              </h1>
            )}

            {/* Proprietário → Cliente */}
            <div className="flex flex-col gap-2 mt-1">
              {/* Proprietário */}
              {trocandoProprietario ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <ContatoPicker label="" value={proprietarioContato} onChange={trocarProprietario} placeholder="Buscar proprietário…" />
                  </div>
                  <button onClick={() => setTrocandoProprietario(false)} className="text-xs text-gray-400 hover:text-gray-700 shrink-0">Cancelar</button>
                </div>
              ) : proprietarioContato ? (
                <div className="flex items-center gap-2 group">
                  <div className="min-w-0">
                    <Link href={`/admin/negocios/contatos/${proprietarioContato.id}`} className="text-sm text-gray-700 hover:text-[#2e3092] font-medium transition-colors">
                      {proprietarioContato.nome}
                    </Link>
                    {proprietarioContato.empresa && <span className="text-xs text-gray-400 ml-1.5">· {proprietarioContato.empresa}</span>}
                  </div>
                  <button onClick={() => setTrocandoProprietario(true)} className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-gray-700 transition-all shrink-0">Trocar</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {processo.parte_a ? (
                    <span className="text-sm text-gray-500" title="Sem vínculo formal com contato">
                      {processo.parte_a} <span className="text-amber-400 text-xs">○</span>
                    </span>
                  ) : null}
                  <button onClick={() => setTrocandoProprietario(true)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                    {processo.parte_a ? "Vincular" : "+ Proprietário"}
                  </button>
                </div>
              )}

              {/* Seta separadora */}
              {(proprietarioContato || clienteContato || processo.parte_a || processo.parte_b) && (
                <span className="text-gray-300 text-sm leading-none pl-1">↓</span>
              )}

              {/* Cliente */}
              {trocandoCliente ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <ContatoPicker label="" value={clienteContato} onChange={trocarCliente} placeholder="Buscar cliente…" />
                  </div>
                  <button onClick={() => setTrocandoCliente(false)} className="text-xs text-gray-400 hover:text-gray-700 shrink-0">Cancelar</button>
                </div>
              ) : clienteContato ? (
                <div className="flex items-center gap-2 group">
                  <div className="min-w-0">
                    <Link href={`/admin/negocios/contatos/${clienteContato.id}`} className="text-sm text-gray-700 hover:text-[#2e3092] font-medium transition-colors">
                      {clienteContato.nome}
                    </Link>
                    {clienteContato.empresa && <span className="text-xs text-gray-400 ml-1.5">· {clienteContato.empresa}</span>}
                  </div>
                  <button onClick={() => setTrocandoCliente(true)} className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-gray-700 transition-all shrink-0">Trocar</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {processo.parte_b ? (
                    <span className="text-sm text-gray-500" title="Sem vínculo formal com contato">
                      {processo.parte_b} <span className="text-amber-400 text-xs">○</span>
                    </span>
                  ) : null}
                  <button onClick={() => setTrocandoCliente(true)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                    {processo.parte_b ? "Vincular" : "+ Cliente"}
                  </button>
                </div>
              )}
            </div>

            {/* Valor */}
            {editandoValor ? (
              <input
                autoFocus
                type="number"
                className="text-sm text-gray-500 border-b border-gray-300 focus:outline-none focus:border-gray-900 bg-transparent"
                placeholder="Valor R$"
                value={editValor}
                onChange={(e) => setEditValor(e.target.value)}
                onBlur={() => { salvarCampo("valor", editValor ? Number(editValor) : null); setEditandoValor(false); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { salvarCampo("valor", editValor ? Number(editValor) : null); setEditandoValor(false); }
                  if (e.key === "Escape") { setEditValor(processo.valor ? String(processo.valor) : ""); setEditandoValor(false); }
                }}
              />
            ) : (
              <p
                className={`text-sm cursor-text transition-colors ${processo.valor ? "text-gray-500 hover:text-gray-700" : "text-gray-300 hover:text-gray-400"}`}
                onClick={() => { setEditValor(processo.valor ? String(processo.valor) : ""); setEditandoValor(true); }}
                title="Clique para editar"
              >
                {processo.valor ? `R$ ${Number(processo.valor).toLocaleString("pt-BR")}` : "+ Valor"}
              </p>
            )}

            {/* Imóvel vinculado */}
            <div className="flex items-center gap-2">
              {processo.galpao ? (
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/admin/imoveis/${processo.galpao.id}/editar`}
                    target="_blank"
                    className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 hover:border-gray-400 transition-colors"
                  >
                    {processo.galpao.titulo} ↗
                  </Link>
                  <button
                    onClick={desvincularGalpao}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    title="Desvincular imóvel"
                  >
                    ✕
                  </button>
                </div>
              ) : mostrarFormGalpao ? (
                <div className="relative">
                  <input
                    autoFocus
                    className="text-sm border-b border-gray-300 focus:outline-none focus:border-gray-900 bg-transparent text-gray-700 w-64"
                    placeholder="Buscar imóvel pelo título..."
                    value={buscaGalpao}
                    onChange={(e) => { setBuscaGalpao(e.target.value); buscarGalpoes(e.target.value); }}
                    onKeyDown={(e) => { if (e.key === "Escape") { setMostrarFormGalpao(false); setBuscaGalpao(""); setResultadosGalpao([]); } }}
                  />
                  {resultadosGalpao.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 shadow-sm z-20">
                      {resultadosGalpao.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => vincularGalpao(g)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                        >
                          <span className="font-medium">{g.titulo}</span>
                          {g.area_total && <span className="text-gray-400 ml-2 text-xs">{g.area_total.toLocaleString("pt-BR")} m²</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setMostrarFormGalpao(true)}
                  className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                >
                  + Vincular imóvel
                </button>
              )}
            </div>
          </div>

          <select value={processo.status} onChange={(e) => atualizarStatus(e.target.value)}
            className="border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-gray-900 bg-white shrink-0">
            {statusOpcoes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Notas */}
        <div className="border-t border-gray-100 pt-4">
          {editandoNotas ? (
            <textarea
              autoFocus
              rows={3}
              className="w-full text-sm text-gray-500 border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-900 bg-transparent resize-none"
              placeholder="Notas sobre o processo..."
              value={editNotas}
              onChange={(e) => setEditNotas(e.target.value)}
              onBlur={() => { salvarCampo("notas", editNotas.trim() || null); setEditandoNotas(false); }}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setEditNotas(processo.notas ?? ""); setEditandoNotas(false); }
              }}
            />
          ) : (
            <p
              className={`text-sm leading-relaxed cursor-text transition-colors ${processo.notas ? "text-gray-500 hover:text-gray-700" : "text-gray-300 hover:text-gray-400"}`}
              onClick={() => { setEditNotas(processo.notas ?? ""); setEditandoNotas(true); }}
              title="Clique para editar"
            >
              {processo.notas ?? "+ Adicionar notas"}
            </p>
          )}
        </div>

        {/* Progresso */}
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

      {/* Contatos vinculados */}
      <div className="bg-white border border-gray-200 p-5 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Contatos vinculados{contatosVinculados.length > 0 && ` (${contatosVinculados.length})`}
        </p>

        {contatosVinculados.length > 0 && (
          <div className="divide-y divide-gray-100 -mx-5">
            {contatosVinculados.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-2.5 group hover:bg-gray-50 transition-colors">
                <Link
                  href={`/admin/negocios/contatos/${c.contato_id}`}
                  className="flex-1 min-w-0 hover:text-gray-600 transition-colors"
                >
                  <p className="text-sm text-gray-900 truncate">{c.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.tipo_principal} · {c.papel}</p>
                </Link>
                <button
                  onClick={() => desvincularContato(c.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-xs shrink-0"
                  title="Desvincular"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {mostrarFormContato ? (
          <div className="space-y-3 pt-1">
            {!contatoSelecionado ? (
              <div className="relative">
                <input
                  autoFocus
                  className={inp}
                  placeholder="Buscar contato pelo nome..."
                  value={buscaContato}
                  onChange={(e) => { setBuscaContato(e.target.value); buscarContatos(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === "Escape") { setMostrarFormContato(false); setBuscaContato(""); setResultadosContato([]); } }}
                />
                {resultadosContato.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 shadow-sm z-20">
                    {resultadosContato.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setContatoSelecionado(c); setBuscaContato(""); setResultadosContato([]); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                      >
                        <span className="font-medium">{c.nome}</span>
                        <span className="text-gray-400 ml-2 text-xs">{c.tipo_principal}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900 bg-gray-100 px-2 py-1">{contatoSelecionado.nome}</span>
                <button onClick={() => setContatoSelecionado(null)} className="text-xs text-gray-400 hover:text-gray-700">✕</button>
              </div>
            )}

            {contatoSelecionado && (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  className={`${inp} flex-1`}
                  placeholder="Papel (ex: Comprador, Advogado...)"
                  value={papelContato}
                  onChange={(e) => setPapelContato(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") vincularContato(); if (e.key === "Escape") { setMostrarFormContato(false); setContatoSelecionado(null); setPapelContato(""); } }}
                />
                <button
                  onClick={vincularContato}
                  disabled={vinculandoContato || !papelContato.trim()}
                  className="bg-gray-900 text-white px-4 py-2 text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 shrink-0"
                >
                  {vinculandoContato ? "..." : "Vincular"}
                </button>
              </div>
            )}

            <button
              onClick={() => { setMostrarFormContato(false); setBuscaContato(""); setResultadosContato([]); setContatoSelecionado(null); setPapelContato(""); }}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setMostrarFormContato(true)}
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            + Vincular contato
          </button>
        )}
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

// ── Header da categoria com drag handle ──────────────────────────────────────

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
