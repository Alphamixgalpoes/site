"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { TIPOS, tipoLabel, tipoPlural } from "../_lib/tipos";

type Contato = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  empresa: string | null;
  cpf_cnpj: string | null;
  tipo_principal: string;
  tags: string[];
  notas: string | null;
  ativo: boolean;
};

type ProcessoVinculado = {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  papel: string;
};

type ImovelResumido = {
  id: string;
  titulo: string;
  tipo: string;
  categoria: string;
  cidade: string | null;
  publicado: boolean;
  area_construida_m2: number | null;
};

type ProcessoResumido = {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  valor: number | null;
};

const tipoProcessoLabel: Record<string, string> = {
  venda: "Venda", locacao: "Locação", regularizacao: "Regularização",
};
const statusLabel: Record<string, string> = {
  em_andamento: "Em andamento", concluido: "Concluído", pausado: "Pausado",
};

const inp = "border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 bg-white w-full placeholder:text-gray-300";
const sel = "border border-gray-200 px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900 bg-white w-full";

export default function ContatoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contato, setContato] = useState<Contato | null>(null);
  const [processos, setProcessos] = useState<ProcessoVinculado[]>([]);
  const [imoveisProprietario, setImoveisProprietario] = useState<ImovelResumido[]>([]);
  const [processosComoProprietario, setProcessosComoProprietario] = useState<ProcessoResumido[]>([]);
  const [processosComoCliente, setProcessosComoCliente] = useState<ProcessoResumido[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // form
  const [nome, setNome] = useState("");
  const [tipoPrincipal, setTipoPrincipal] = useState("cliente");
  const [tagsAdicionais, setTagsAdicionais] = useState<string[]>([]);
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => { load(); }, [id]);

  async function load() {
    const supabase = createClient();
    const [{ data: c }, { data: pc }, { data: imoveis }, { data: procProp }, { data: procCli }] = await Promise.all([
      supabase.from("contatos").select("*").eq("id", id).single(),
      supabase.from("processo_contatos").select("papel, processos(id, titulo, tipo, status)").eq("contato_id", id),
      supabase.from("galpoes").select("id, titulo, tipo, categoria, cidade, publicado, area_construida_m2").eq("proprietario_id", id).order("created_at", { ascending: false }),
      supabase.from("processos").select("id, titulo, tipo, status, valor").eq("proprietario_id", id).order("created_at", { ascending: false }),
      supabase.from("processos").select("id, titulo, tipo, status, valor").eq("cliente_id", id).order("created_at", { ascending: false }),
    ]);

    if (c) {
      setContato(c);
      setNome(c.nome);
      setTipoPrincipal(c.tipo_principal);
      setTagsAdicionais(c.tags.filter((t: string) => t !== c.tipo_principal));
      setTelefone(c.telefone ?? "");
      setEmail(c.email ?? "");
      setEmpresa(c.empresa ?? "");
      setCpfCnpj(c.cpf_cnpj ?? "");
      setNotas(c.notas ?? "");
    }

    if (pc) {
      setProcessos(
        pc
          .filter((row) => row.processos)
          .map((row) => ({
            ...(row.processos as unknown as { id: string; titulo: string; tipo: string; status: string }),
            papel: row.papel,
          }))
      );
    }

    setImoveisProprietario((imoveis ?? []) as ImovelResumido[]);
    setProcessosComoProprietario((procProp ?? []) as ProcessoResumido[]);
    setProcessosComoCliente((procCli ?? []) as ProcessoResumido[]);
    setLoading(false);
  }

  async function salvar() {
    setSaving(true);
    const tags = [...new Set([tipoPrincipal, ...tagsAdicionais])];
    const supabase = createClient();
    await supabase.from("contatos").update({
      nome: nome.trim(),
      tipo_principal: tipoPrincipal,
      tags,
      telefone: telefone.trim() || null,
      email: email.trim() || null,
      empresa: empresa.trim() || null,
      cpf_cnpj: cpfCnpj.trim() || null,
      notas: notas.trim() || null,
    }).eq("id", id);
    setSaving(false);
  }

  async function excluir() {
    const supabase = createClient();
    await supabase.from("contatos").update({ ativo: false }).eq("id", id);
    router.push("/admin/contatos");
  }

  function toggleTagAdicional(tag: string) {
    setTagsAdicionais((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>;
  if (!contato) return <div className="text-sm text-gray-400 py-12 text-center">Contato não encontrado.</div>;

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/admin/contatos" className="hover:text-gray-900 transition-colors">Contatos</Link>
        <span>/</span>
        <span className="text-gray-700 truncate">{contato.nome}</span>
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-200 p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Dados do contato</p>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Nome *</label>
          <input className={inp} value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Tipo principal</label>
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
          <p className="text-xs text-gray-300 mt-1.5">
            Aparece em <strong className="text-gray-400">{tipoPlural(tipoPrincipal)}</strong> na agenda.
            Tags adicionais permitem encontrá-lo em buscas por outros papéis.
          </p>
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
          <textarea className={`${inp} h-24 resize-none`} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>

        {/* Ações rápidas se tiver telefone */}
        {telefone && (
          <div className="flex gap-2 pt-1">
            <a
              href={`https://wa.me/55${telefone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 hover:border-gray-400 transition-colors"
            >
              Abrir WhatsApp
            </a>
            <a
              href={`tel:${telefone.replace(/\D/g, "")}`}
              className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 hover:border-gray-400 transition-colors"
            >
              Ligar
            </a>
            {email && (
              <a
                href={`mailto:${email}`}
                className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 hover:border-gray-400 transition-colors"
              >
                E-mail
              </a>
            )}
          </div>
        )}
      </div>

      {/* Salvar */}
      <div className="flex items-center justify-between">
        <button
          onClick={salvar}
          disabled={saving || !nome.trim()}
          className="bg-gray-900 text-white px-5 py-2 text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-40"
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <button onClick={excluir} className="text-xs text-red-600 hover:text-red-800 font-medium">Confirmar exclusão</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 hover:text-gray-700">Cancelar</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">
            Excluir contato
          </button>
        )}
      </div>

      {/* Processos vinculados (outros papéis) */}
      {processos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Processos vinculados ({processos.length})
          </p>
          <div className="bg-white border border-gray-200 divide-y divide-gray-100">
            {processos.map((p) => (
              <Link
                key={p.id}
                href={`/admin/negocios/pipeline/${p.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tipoProcessoLabel[p.tipo] ?? p.tipo} · papel: {p.papel}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{statusLabel[p.status] ?? p.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Imóveis (proprietário) */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Imóveis (proprietário){imoveisProprietario.length > 0 && ` (${imoveisProprietario.length})`}
        </p>
        {imoveisProprietario.length === 0 ? (
          <p className="text-xs text-gray-300">Nenhum imóvel vinculado como proprietário.</p>
        ) : (
          <div className="bg-white border border-gray-200 divide-y divide-gray-100">
            {imoveisProprietario.map((g) => (
              <Link
                key={g.id}
                href={`/admin/imoveis/${g.id}/editar`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{g.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {g.categoria === "galpao" ? "Galpão" : g.categoria === "loja" ? "Loja" : "Terreno"}
                    {g.cidade ? ` · ${g.cidade}` : ""}
                    {g.area_construida_m2 ? ` · ${g.area_construida_m2.toLocaleString("pt-BR")} m²` : ""}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 shrink-0 font-medium ${g.publicado ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                  {g.publicado ? "Publicado" : "Oculto"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Processos como proprietário */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Processos como proprietário{processosComoProprietario.length > 0 && ` (${processosComoProprietario.length})`}
        </p>
        {processosComoProprietario.length === 0 ? (
          <p className="text-xs text-gray-300">Nenhum processo como proprietário.</p>
        ) : (
          <div className="bg-white border border-gray-200 divide-y divide-gray-100">
            {processosComoProprietario.map((p) => (
              <Link
                key={p.id}
                href={`/admin/negocios/pipeline/${p.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tipoProcessoLabel[p.tipo] ?? p.tipo}
                    {p.valor ? ` · R$ ${Number(p.valor).toLocaleString("pt-BR")}` : ""}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{statusLabel[p.status] ?? p.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Processos como cliente */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Processos como cliente{processosComoCliente.length > 0 && ` (${processosComoCliente.length})`}
        </p>
        {processosComoCliente.length === 0 ? (
          <p className="text-xs text-gray-300">Nenhum processo como cliente.</p>
        ) : (
          <div className="bg-white border border-gray-200 divide-y divide-gray-100">
            {processosComoCliente.map((p) => (
              <Link
                key={p.id}
                href={`/admin/negocios/pipeline/${p.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tipoProcessoLabel[p.tipo] ?? p.tipo}
                    {p.valor ? ` · R$ ${Number(p.valor).toLocaleString("pt-BR")}` : ""}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{statusLabel[p.status] ?? p.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
