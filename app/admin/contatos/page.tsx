"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { TIPOS, tipoLabel, tipoPlural } from "./tipos";

type Contato = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  empresa: string | null;
  tipo_principal: string;
  tags: string[];
  notas: string | null;
  ativo: boolean;
};

const inp = "border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 bg-white w-full placeholder:text-gray-300";
const sel = "border border-gray-200 px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 bg-white w-full";

export default function ContatosPage() {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [tagFiltro, setTagFiltro] = useState("todas");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // form
  const [nome, setNome] = useState("");
  const [tipoPrincipal, setTipoPrincipal] = useState("cliente");
  const [tagsAdicionais, setTagsAdicionais] = useState<string[]>([]);
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("contatos")
      .select("*")
      .eq("ativo", true)
      .order("nome");
    setContatos(data ?? []);
    setLoading(false);
  }

  function resetForm() {
    setNome(""); setTipoPrincipal("cliente"); setTagsAdicionais([]);
    setTelefone(""); setEmail(""); setEmpresa(""); setCpfCnpj(""); setNotas("");
  }

  function toggleTagAdicional(tag: string) {
    setTagsAdicionais((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function criar() {
    if (!nome.trim()) return;
    setSaving(true);
    const tags = [...new Set([tipoPrincipal, ...tagsAdicionais])];
    const supabase = createClient();
    const { data } = await supabase.from("contatos").insert({
      nome: nome.trim(),
      tipo_principal: tipoPrincipal,
      tags,
      telefone: telefone.trim() || null,
      email: email.trim() || null,
      empresa: empresa.trim() || null,
      cpf_cnpj: cpfCnpj.trim() || null,
      notas: notas.trim() || null,
    }).select().single();

    setSaving(false);
    if (data) {
      setContatos((prev) => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
      setModal(false);
      resetForm();
    }
  }

  // Filtragem
  const filtrados = useMemo(() => {
    let lista = contatos;
    if (tagFiltro !== "todas") lista = lista.filter((c) => c.tags.includes(tagFiltro));
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      lista = lista.filter((c) =>
        c.nome.toLowerCase().includes(q) ||
        c.empresa?.toLowerCase().includes(q) ||
        c.telefone?.includes(q) ||
        c.tags.some((t) => tipoLabel(t).toLowerCase().includes(q))
      );
    }
    return lista;
  }, [contatos, busca, tagFiltro]);

  // Agrupamento por tipo_principal (só quando sem busca e sem tag filter)
  const modoAgrupado = !busca.trim() && tagFiltro === "todas";

  const grupos = useMemo(() => {
    if (!modoAgrupado) return null;
    const map = new Map<string, Contato[]>();
    for (const c of filtrados) {
      if (!map.has(c.tipo_principal)) map.set(c.tipo_principal, []);
      map.get(c.tipo_principal)!.push(c);
    }
    // Ordenar grupos pela ordem definida em TIPOS
    return TIPOS
      .map((t) => ({ tipo: t.value, plural: t.plural, contatos: map.get(t.value) ?? [] }))
      .filter((g) => g.contatos.length > 0);
  }, [filtrados, modoAgrupado]);

  const tagsFiltroOptions = useMemo(() => {
    const all = new Set(contatos.flatMap((c) => c.tags));
    return TIPOS.filter((t) => all.has(t.value));
  }, [contatos]);

  return (
    <div className="space-y-5">

      {/* Topo */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Contatos</h1>
          <p className="text-sm text-gray-400 mt-0.5">{contatos.length} contato{contatos.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + Novo Contato
        </button>
      </div>

      {/* Busca e filtro */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nome, empresa ou telefone..."
          className="border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-gray-900 bg-white flex-1 min-w-48 placeholder:text-gray-300"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-gray-900 bg-white"
          value={tagFiltro}
          onChange={(e) => setTagFiltro(e.target.value)}
        >
          <option value="todas">Todas as tags</option>
          {tagsFiltroOptions.map((t) => (
            <option key={t.value} value={t.value}>{t.plural}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center">
          {contatos.length === 0 ? "Nenhum contato cadastrado. Clique em + Novo Contato para começar." : "Nenhum contato encontrado."}
        </div>
      ) : modoAgrupado && grupos ? (
        // Agrupado por tipo_principal
        <div className="space-y-6">
          {grupos.map((grupo) => (
            <div key={grupo.tipo}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                {grupo.plural} <span className="font-normal">({grupo.contatos.length})</span>
              </p>
              <div className="bg-white border border-gray-200 divide-y divide-gray-100">
                {grupo.contatos.map((c) => (
                  <ContatoRow key={c.id} contato={c} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Lista plana A-Z (busca ou filtro ativo)
        <div>
          {!modoAgrupado && (
            <p className="text-xs text-gray-400 mb-2">{filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}</p>
          )}
          <div className="bg-white border border-gray-200 divide-y divide-gray-100">
            {filtrados.map((c) => <ContatoRow key={c.id} contato={c} />)}
          </div>
        </div>
      )}

      {/* Modal novo contato */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Novo Contato</p>
              <button onClick={() => { setModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-900 text-lg leading-none">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nome *</label>
                <input className={inp} placeholder="Nome completo ou razão social" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Tipo principal *</label>
                  <select className={sel} value={tipoPrincipal} onChange={(e) => setTipoPrincipal(e.target.value)}>
                    {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Empresa</label>
                  <input className={inp} placeholder="Opcional" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Tags adicionais</label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS.filter((t) => t.value !== tipoPrincipal).map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => toggleTagAdicional(t.value)}
                      className={`text-xs px-2.5 py-1 border transition-colors ${
                        tagsAdicionais.includes(t.value)
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 text-gray-500 hover:border-gray-400"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Telefone</label>
                  <input className={inp} placeholder="(11) 99999-9999" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">E-mail</label>
                  <input type="email" className={inp} placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">CPF / CNPJ</label>
                <input className={inp} placeholder="Opcional" value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Notas</label>
                <textarea className={`${inp} h-20 resize-none`} placeholder="Observações relevantes..." value={notas} onChange={(e) => setNotas(e.target.value)} />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button onClick={() => { setModal(false); resetForm(); }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Cancelar
              </button>
              <button
                onClick={criar}
                disabled={saving || !nome.trim()}
                className="bg-gray-900 text-white px-5 py-2 text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-40"
              >
                {saving ? "Salvando..." : "Salvar contato"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContatoRow({ contato }: { contato: Contato }) {
  const tagsExtras = contato.tags.filter((t) => t !== contato.tipo_principal);

  return (
    <Link
      href={`/admin/contatos/${contato.id}`}
      className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
    >
      {/* Inicial */}
      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
        <span className="text-xs font-semibold text-gray-600">
          {contato.nome.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{contato.nome}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {[contato.empresa, contato.telefone].filter(Boolean).join(" · ")}
        </p>
      </div>

      {/* Tags extras */}
      {tagsExtras.length > 0 && (
        <div className="hidden md:flex gap-1 shrink-0">
          {tagsExtras.map((t) => (
            <span key={t} className="text-xs border border-gray-200 text-gray-400 px-1.5 py-0.5">
              {tipoLabel(t)}
            </span>
          ))}
        </div>
      )}

      {/* Tipo principal */}
      <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
        {tipoLabel(contato.tipo_principal)}
      </span>
    </Link>
  );
}
