"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

type Processo = {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  galpao_titulo: string | null;
  parte_a: string | null;
  parte_b: string | null;
  valor: number | null;
  notas: string | null;
  created_at: string;
};

type TipoDisponivel = {
  id: string;
  slug: string;
  label: string;
};

const statusLabel: Record<string, string> = {
  em_andamento: "Em andamento",
  concluido: "Concluído",
  pausado: "Pausado",
};

const statusCls: Record<string, string> = {
  em_andamento: "bg-blue-100 text-blue-700",
  concluido: "bg-green-100 text-green-700",
  pausado: "bg-gray-100 text-gray-500",
};

// Cores fixas para os 3 tipos originais; novos tipos usam cor padrão
const tipoCls: Record<string, string> = {
  venda: "bg-gray-900 text-white",
  locacao: "bg-gray-700 text-white",
  regularizacao: "bg-amber-100 text-amber-700",
};

const sel = "border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-gray-900 bg-white w-full";
const inp = "border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 bg-white w-full placeholder:text-gray-300";

export default function ProcessosPage() {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [tiposDisponiveis, setTiposDisponiveis] = useState<TipoDisponivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  // form
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("venda");
  const [parteA, setParteA] = useState("");
  const [parteB, setParteB] = useState("");
  const [valor, setValor] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const [{ data: procs }, { data: tipos }] = await Promise.all([
      supabase.from("processos").select("*").order("created_at", { ascending: false }),
      supabase.from("processo_tipos").select("id, slug, label").eq("ativo", true).order("ordem"),
    ]);
    setProcessos(procs ?? []);
    // Fallback: se a tabela ainda não existir, usa os 3 hardcoded
    if (tipos && tipos.length > 0) {
      setTiposDisponiveis(tipos);
      setTipo(tipos[0].slug);
    } else {
      setTiposDisponiveis([
        { id: "venda", slug: "venda", label: "Venda" },
        { id: "locacao", slug: "locacao", label: "Locação" },
        { id: "regularizacao", slug: "regularizacao", label: "Regularização" },
      ]);
    }
    setLoading(false);
  }

  // Mapa slug -> label para exibição na lista
  const tipoLabelMap: Record<string, string> = Object.fromEntries(
    tiposDisponiveis.map((t) => [t.slug, t.label])
  );

  async function criar() {
    if (!titulo.trim()) return;
    setSaving(true);
    const supabase = createClient();

    const { data: proc, error } = await supabase
      .from("processos")
      .insert({
        titulo: titulo.trim(),
        tipo,
        parte_a: parteA.trim() || null,
        parte_b: parteB.trim() || null,
        valor: valor ? Number(valor) : null,
        notas: notas.trim() || null,
      })
      .select()
      .single();

    if (error || !proc) { setSaving(false); return; }

    // Tenta usar template do banco
    const { data: templateTipo } = await supabase
      .from("processo_tipos")
      .select(`
        id,
        processo_tipo_categorias (
          id, slug, label, ordem,
          processo_tipo_itens ( titulo, descricao, ordem )
        )
      `)
      .eq("slug", tipo)
      .single();

    if ((templateTipo?.processo_tipo_categorias?.length ?? 0) > 0) {
      const categorias = (templateTipo!.processo_tipo_categorias as any[])
        .sort((a, b) => a.ordem - b.ordem);

      // Insere categorias do processo
      await supabase.from("processo_categorias").insert(
        categorias.map((c) => ({
          processo_id: proc.id,
          slug: c.slug,
          label: c.label,
          ordem: c.ordem,
        }))
      );

      // Insere itens do processo
      const itens = categorias.flatMap((c: any) =>
        (c.processo_tipo_itens ?? []).map((item: any) => ({
          processo_id: proc.id,
          categoria: c.slug,
          titulo: item.titulo,
          descricao: item.descricao ?? null,
          ordem: item.ordem,
        }))
      );
      if (itens.length > 0) {
        await supabase.from("processo_itens").insert(itens);
      }
    }

    setSaving(false);
    setModal(false);
    resetForm();
    load();
  }

  function resetForm() {
    const primeiroTipo = tiposDisponiveis[0]?.slug ?? "venda";
    setTitulo(""); setTipo(primeiroTipo); setParteA(""); setParteB(""); setValor(""); setNotas("");
  }

  const filtrados = processos.filter((p) => {
    if (filtroStatus !== "todos" && p.status !== filtroStatus) return false;
    if (filtroTipo !== "todos" && p.tipo !== filtroTipo) return false;
    return true;
  });

  const stats = {
    em_andamento: processos.filter((p) => p.status === "em_andamento").length,
    concluido: processos.filter((p) => p.status === "concluido").length,
    pausado: processos.filter((p) => p.status === "pausado").length,
  };

  // Labels de partes dependendo do tipo selecionado
  const labelParteA = tipo === "locacao" ? "Locador" : "Vendedor / Proprietário";
  const labelParteB = tipo === "locacao" ? "Locatário" : tipo === "regularizacao" ? "Responsável" : "Comprador";

  return (
    <div className="space-y-5">

      {/* Topo */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Processos</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {stats.em_andamento} em andamento · {stats.concluido} concluídos · {stats.pausado} pausados
          </p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + Novo Processo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select className="border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-gray-900 bg-white" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          {tiposDisponiveis.map((t) => (
            <option key={t.slug} value={t.slug}>{t.label}</option>
          ))}
        </select>
        <select className="border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-gray-900 bg-white" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          <option value="em_andamento">Em andamento</option>
          <option value="pausado">Pausado</option>
          <option value="concluido">Concluído</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center">
          {processos.length === 0 ? "Nenhum processo cadastrado. Clique em + Novo Processo para começar." : "Nenhum processo com os filtros selecionados."}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 divide-y divide-gray-100">
          {filtrados.map((p) => (
            <Link
              key={p.id}
              href={`/admin/processos/${p.id}`}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <span className={`text-xs px-2 py-0.5 font-medium shrink-0 ${tipoCls[p.tipo] ?? "bg-gray-100 text-gray-600"}`}>
                {tipoLabelMap[p.tipo] ?? p.tipo}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.titulo}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {[p.parte_a, p.parte_b].filter(Boolean).join(" → ")}
                  {p.galpao_titulo && ` · ${p.galpao_titulo}`}
                </p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {[
                    p.valor ? `R$ ${Number(p.valor).toLocaleString("pt-BR")}` : null,
                    new Date(p.created_at).toLocaleDateString("pt-BR"),
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>

              <span className={`text-xs px-2.5 py-1 font-medium shrink-0 ${statusCls[p.status] ?? "bg-gray-100 text-gray-500"}`}>
                {statusLabel[p.status] ?? p.status}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Modal novo processo */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Novo Processo</p>
              <button onClick={() => { setModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-900 transition-colors text-lg leading-none">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Título *</label>
                <input className={inp} placeholder="Ex: Locação Galpão Alphaville — Empresa X" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Tipo *</label>
                <select className={sel} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {tiposDisponiveis.map((t) => (
                    <option key={t.slug} value={t.slug}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{labelParteA}</label>
                  <input className={inp} placeholder="Nome ou empresa" value={parteA} onChange={(e) => setParteA(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{labelParteB}</label>
                  <input className={inp} placeholder="Nome ou empresa" value={parteB} onChange={(e) => setParteB(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Valor R$ (opcional)</label>
                <input type="number" className={inp} placeholder="0" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Notas iniciais (opcional)</label>
                <textarea className={`${inp} h-20 resize-none`} placeholder="Observações relevantes sobre o processo..." value={notas} onChange={(e) => setNotas(e.target.value)} />
              </div>

              <p className="text-xs text-gray-400">
                O checklist de documentos e certidões será criado automaticamente com base no tipo selecionado.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button onClick={() => { setModal(false); resetForm(); }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Cancelar
              </button>
              <button
                onClick={criar}
                disabled={saving || !titulo.trim()}
                className="bg-gray-900 text-white px-5 py-2 text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-40"
              >
                {saving ? "Criando..." : "Criar processo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
