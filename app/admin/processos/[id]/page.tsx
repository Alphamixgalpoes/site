"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
};

const categorias = [
  { key: "documento", label: "Documentos" },
  { key: "certidao", label: "Certidões" },
  { key: "acao", label: "Ações" },
  { key: "recomendacao", label: "Recomendações" },
] as const;

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

export default function ProcessoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // novo item
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaCategoria, setNovaCategoria] = useState<string>("acao");
  const [adicionando, setAdicionando] = useState(false);
  const [mostrarFormItem, setMostrarFormItem] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const supabase = createClient();
    const [{ data: proc }, { data: its }] = await Promise.all([
      supabase.from("processos").select("*").eq("id", id).single(),
      supabase.from("processo_itens").select("*").eq("processo_id", id).order("ordem"),
    ]);
    setProcesso(proc);
    setItens(its ?? []);
    setLoading(false);
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
    if (!novoTitulo.trim()) return;
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
    setItens((prev) => prev.filter((i) => i.id !== itemId));
    const supabase = createClient();
    await supabase.from("processo_itens").delete().eq("id", itemId);
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

      {/* Header do processo */}
      <div className="bg-white border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{tipoLabel[processo.tipo] ?? processo.tipo}</p>
            <h1 className="text-lg font-semibold text-gray-900">{processo.titulo}</h1>
            {(processo.parte_a || processo.parte_b) && (
              <p className="text-sm text-gray-500 mt-1">
                {[processo.parte_a, processo.parte_b].filter(Boolean).join(" → ")}
              </p>
            )}
            {processo.valor && (
              <p className="text-sm text-gray-500 mt-0.5">R$ {Number(processo.valor).toLocaleString("pt-BR")}</p>
            )}
          </div>

          <select
            value={processo.status}
            onChange={(e) => atualizarStatus(e.target.value)}
            className="border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-gray-900 bg-white shrink-0"
          >
            {statusOpcoes.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {processo.notas && (
          <p className="text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">{processo.notas}</p>
        )}

        {/* Progresso */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">Progresso</p>
            <p className="text-xs font-medium text-gray-700">{feitos} / {total} itens concluídos</p>
          </div>
          <div className="w-full bg-gray-100 h-1.5">
            <div
              className="bg-gray-900 h-1.5 transition-all duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist por categoria */}
      {categorias.map(({ key, label }) => {
        const itensCat = itens.filter((i) => i.categoria === key);
        if (itensCat.length === 0 && key !== "acao") return null;
        return (
          <div key={key}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{label}</p>
            <div className="bg-white border border-gray-200 divide-y divide-gray-100">
              {itensCat.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3 group">
                  <button
                    onClick={() => toggleFeito(item)}
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
                  </div>
                  <button
                    onClick={() => removerItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs shrink-0 mt-0.5"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {itensCat.length === 0 && (
                <div className="px-4 py-3 text-xs text-gray-300">Nenhum item nesta categoria.</div>
              )}
            </div>
          </div>
        );
      })}

      {/* Adicionar item */}
      <div>
        {mostrarFormItem ? (
          <div className="bg-white border border-gray-200 p-4 space-y-3">
            <select
              className="border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-gray-900 bg-white"
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
            >
              {categorias.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
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
              <button
                onClick={adicionarItem}
                disabled={adicionando || !novoTitulo.trim()}
                className="bg-gray-900 text-white px-4 py-1.5 text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-40"
              >
                {adicionando ? "Adicionando..." : "Adicionar"}
              </button>
              <button
                onClick={() => { setMostrarFormItem(false); setNovoTitulo(""); }}
                className="text-xs text-gray-400 hover:text-gray-900 transition-colors px-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setMostrarFormItem(true)}
            className="text-sm text-gray-400 hover:text-gray-900 transition-colors"
          >
            + Adicionar item
          </button>
        )}
      </div>

    </div>
  );
}
