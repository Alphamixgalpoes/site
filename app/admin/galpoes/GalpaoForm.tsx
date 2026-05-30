"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { ConfigCampo, OverridesVisibilidade } from "@/lib/visibilidade";

type Galpao = {
  id?: string;
  titulo: string;
  categoria: string;
  uso_terreno: string;
  tipo: string;
  valor: string;
  endereco: string;
  bairro: string;
  cidade: string;
  cep: string;
  area_total_m2: string;
  area_construida_m2: string;
  area_piso_m2: string;
  pe_direito_m: string;
  numero_docas: string;
  acesso_carreta: boolean;
  potencia_eletrica_kva: string;
  sprinklers: boolean;
  guarita: boolean;
  vagas_estacionamento: string;
  condominio: boolean;
  valor_condominio: string;
  descricao: string;
  observacoes: string;
  campos_visibilidade?: OverridesVisibilidade;
};

const empty: Galpao = {
  titulo: "", categoria: "galpao", uso_terreno: "", tipo: "locacao", valor: "", endereco: "", bairro: "",
  cidade: "Barueri", cep: "", area_total_m2: "", area_construida_m2: "",
  area_piso_m2: "", pe_direito_m: "", numero_docas: "0", acesso_carreta: false,
  potencia_eletrica_kva: "", sprinklers: false, guarita: false,
  vagas_estacionamento: "0", condominio: false, valor_condominio: "",
  descricao: "", observacoes: "", campos_visibilidade: {},
};

type WarningInfo = {
  confidenciaisVisiveis: string[];
  diferentesDopadrao: { label: string; detalhes: string }[];
};

type ImagemExistente = {
  id: string;
  storage_path: string;
  ordem: number;
  visivel_site: boolean;
  is_capa: boolean;
};

export default function GalpaoForm({
  initial,
  imagens,
  configCampos = [],
}: {
  initial?: Partial<Galpao> & { id?: string };
  imagens?: ImagemExistente[];
  configCampos?: ConfigCampo[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<Galpao>({ ...empty, ...initial });
  const [visibilidade, setVisibilidade] = useState<OverridesVisibilidade>(
    (initial?.campos_visibilidade as OverridesVisibilidade) ?? {}
  );
  const [files, setFiles] = useState<FileList | null>(null);
  const [existingImagens, setExistingImagens] = useState<ImagemExistente[]>(
    (imagens ?? []).map((img) => ({
      ...img,
      visivel_site: img.visivel_site ?? true,
      is_capa: img.is_capa ?? false,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [warningModal, setWarningModal] = useState<WarningInfo | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  function set(field: keyof Galpao, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setVis(campo: string, contexto: "card" | "ficha", valor: boolean) {
    setVisibilidade((prev) => {
      const config = configCampos.find((c) => c.campo_chave === campo);
      const cardAtual = prev[campo]?.card ?? config?.visivel_card ?? true;
      const fichaAtual = prev[campo]?.ficha ?? config?.visivel_ficha ?? true;
      return {
        ...prev,
        [campo]: {
          card: contexto === "card" ? valor : cardAtual,
          ficha: contexto === "ficha" ? valor : fichaAtual,
        },
      };
    });
  }

  function calcularAvisos(): WarningInfo {
    const confidenciaisVisiveis: string[] = [];
    const diferentesDopadrao: { label: string; detalhes: string }[] = [];

    for (const config of configCampos) {
      const override = visibilidade[config.campo_chave];
      const cardEfetivo = override?.card ?? config.visivel_card;
      const fichaEfetivo = override?.ficha ?? config.visivel_ficha;

      if (config.confidencial && (cardEfetivo || fichaEfetivo)) {
        const contextos = [cardEfetivo && "Card", fichaEfetivo && "Ficha"].filter(Boolean).join(" e ");
        confidenciaisVisiveis.push(`${config.label} → ${contextos}`);
      }

      if (!config.confidencial && override) {
        const diffs: string[] = [];
        if (cardEfetivo !== config.visivel_card)
          diffs.push(`Card ${cardEfetivo ? "ativado" : "desativado"} (padrão: ${config.visivel_card ? "ativado" : "desativado"})`);
        if (fichaEfetivo !== config.visivel_ficha)
          diffs.push(`Ficha ${fichaEfetivo ? "ativada" : "desativada"} (padrão: ${config.visivel_ficha ? "ativada" : "desativada"})`);
        if (diffs.length > 0)
          diferentesDopadrao.push({ label: config.label, detalhes: diffs.join(", ") });
      }
    }

    return { confidenciaisVisiveis, diferentesDopadrao };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const avisos = calcularAvisos();
    if (avisos.confidenciaisVisiveis.length > 0 || avisos.diferentesDopadrao.length > 0) {
      setWarningModal(avisos);
      return;
    }
    await doSave();
  }

  async function doSave() {
    setSaving(true);
    setError("");
    setWarningModal(null);

    // Calcular overrides finais — só armazena diferenças em relação ao padrão global
    const overridesFinal: OverridesVisibilidade = {};
    for (const [campo, valores] of Object.entries(visibilidade)) {
      const global = configCampos.find((c) => c.campo_chave === campo);
      if (!global) continue;
      if (valores.card !== global.visivel_card || valores.ficha !== global.visivel_ficha) {
        overridesFinal[campo] = valores;
      }
    }

    const supabase = createClient();
    const payload = {
      titulo: form.titulo,
      categoria: form.categoria,
      uso_terreno: form.categoria === "terreno" && form.uso_terreno ? form.uso_terreno : null,
      tipo: form.tipo,
      valor: form.valor ? Number(form.valor) : null,
      endereco: form.endereco,
      bairro: form.bairro,
      cidade: form.cidade,
      cep: form.cep,
      area_total_m2: form.area_total_m2 ? Number(form.area_total_m2) : null,
      area_construida_m2: form.area_construida_m2 ? Number(form.area_construida_m2) : null,
      area_piso_m2: form.area_piso_m2 ? Number(form.area_piso_m2) : null,
      pe_direito_m: form.pe_direito_m ? Number(form.pe_direito_m) : null,
      numero_docas: Number(form.numero_docas),
      acesso_carreta: form.acesso_carreta,
      potencia_eletrica_kva: form.potencia_eletrica_kva ? Number(form.potencia_eletrica_kva) : null,
      sprinklers: form.sprinklers,
      guarita: form.guarita,
      vagas_estacionamento: Number(form.vagas_estacionamento),
      condominio: form.condominio,
      valor_condominio: form.valor_condominio ? Number(form.valor_condominio) : null,
      descricao: form.descricao,
      observacoes: form.observacoes,
      campos_visibilidade: overridesFinal,
      updated_at: new Date().toISOString(),
    };

    let galpaoId = form.id;

    if (galpaoId) {
      const { error } = await supabase.from("galpoes").update(payload).eq("id", galpaoId);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("galpoes").insert(payload).select("id").single();
      if (error) { setError(error.message); setSaving(false); return; }
      galpaoId = data.id;
    }

    if (form.endereco || form.cidade) {
      try {
        const params = new URLSearchParams({ endereco: form.endereco, bairro: form.bairro, cidade: form.cidade, cep: form.cep });
        const geoRes = await fetch(`/api/geocode?${params}`);
        if (geoRes.ok) {
          const { lat, lng } = await geoRes.json();
          if (lat && lng) await supabase.from("galpoes").update({ latitude: lat, longitude: lng }).eq("id", galpaoId);
        }
      } catch { /* geocoding optional */ }
    }

    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
        const path = `${galpaoId}/${Date.now()}-${i}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("galpoes").upload(path, file);
        if (!uploadError) {
          await supabase.from("galpao_imagens").insert({ galpao_id: galpaoId, storage_path: path, ordem: existingImagens.length + i });
        }
      }
    }

    router.push("/admin");
    router.refresh();
  }

  async function removeImagem(imagemId: string, path: string) {
    const supabase = createClient();
    await supabase.storage.from("galpoes").remove([path]);
    const { error: delErr } = await supabase.from("galpao_imagens").delete().eq("id", imagemId);
    if (delErr) { setError(`Erro ao excluir imagem: ${delErr.message}`); return; }
    setExistingImagens((imgs) => imgs.filter((i) => i.id !== imagemId));
  }

  async function definirCapa(imagemId: string) {
    if (!form.id) return;
    const supabase = createClient();
    const { error: e1 } = await supabase.from("galpao_imagens").update({ is_capa: false }).eq("galpao_id", form.id);
    if (e1) { setError(`Erro ao redefinir capa: ${e1.message}`); return; }
    const { error: e2 } = await supabase.from("galpao_imagens").update({ is_capa: true }).eq("id", imagemId);
    if (e2) { setError(`Erro ao definir capa: ${e2.message}`); return; }
    setExistingImagens((imgs) => imgs.map((i) => ({ ...i, is_capa: i.id === imagemId })));
  }

  async function toggleVisibilidadeSite(imagemId: string, atual: boolean) {
    const supabase = createClient();
    const { error: updErr } = await supabase.from("galpao_imagens").update({ visivel_site: !atual }).eq("id", imagemId);
    if (updErr) { setError(`Erro ao alterar visibilidade: ${updErr.message}`); return; }
    setExistingImagens((imgs) => imgs.map((i) => i.id === imagemId ? { ...i, visivel_site: !atual } : i));
  }

  // ── Componentes auxiliares de campos ────────────────────────────────────────

  const inputClass = "w-full border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900";

  /** Campo fixo — título, categoria, tipo, cidade */
  function FieldFixo({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-600">{label}</label>
          <span className="text-xs text-gray-300">📌 sempre visível</span>
        </div>
        {children}
      </div>
    );
  }

  /** Campo configurável — com toggles Card / Ficha */
  function FieldVis({ label, campoChave, children }: { label: string; campoChave: string; children: React.ReactNode }) {
    const config = configCampos.find((c) => c.campo_chave === campoChave);
    const cardVal = visibilidade[campoChave]?.card ?? config?.visivel_card ?? true;
    const fichaVal = visibilidade[campoChave]?.ficha ?? config?.visivel_ficha ?? true;
    const isConfidencial = config?.confidencial ?? false;

    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
            {label}
            {isConfidencial && <span className="text-amber-600 text-xs font-semibold">🔒</span>}
          </label>
          <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0 ml-2">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={cardVal} onChange={(e) => setVis(campoChave, "card", e.target.checked)} className="w-3 h-3 accent-[#2e3092]" />
              Card
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={fichaVal} onChange={(e) => setVis(campoChave, "ficha", e.target.checked)} className="w-3 h-3 accent-[#2e3092]" />
              Ficha
            </label>
          </div>
        </div>
        {children}
      </div>
    );
  }

  /** Linha para campo booleano (checkbox) com toggles Card / Ficha */
  function BoolVis({ label, campoChave, field }: { label: string; campoChave: string; field: keyof Galpao }) {
    const config = configCampos.find((c) => c.campo_chave === campoChave);
    const cardVal = visibilidade[campoChave]?.card ?? config?.visivel_card ?? true;
    const fichaVal = visibilidade[campoChave]?.ficha ?? config?.visivel_ficha ?? true;
    const isConfidencial = config?.confidencial ?? false;

    return (
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form[field] as boolean}
            onChange={(e) => set(field, e.target.checked)}
            className="w-4 h-4"
          />
          {label}
          {isConfidencial && <span className="text-amber-600 text-xs">🔒</span>}
        </label>
        <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={cardVal} onChange={(e) => setVis(campoChave, "card", e.target.checked)} className="w-3 h-3 accent-[#2e3092]" />
            Card
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={fichaVal} onChange={(e) => setVis(campoChave, "ficha", e.target.checked)} className="w-3 h-3 accent-[#2e3092]" />
            Ficha
          </label>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Identificação */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Identificação</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FieldFixo label="Título interno *">
                <input className={inputClass} value={form.titulo} onChange={(e) => set("titulo", e.target.value)} required />
              </FieldFixo>
            </div>
            <FieldFixo label="Categoria *">
              <select className={inputClass} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
                <option value="galpao">Galpão</option>
                <option value="loja">Loja</option>
                <option value="terreno">Terreno</option>
              </select>
            </FieldFixo>
            {form.categoria === "terreno" && (
              <FieldVis label="Uso do terreno" campoChave="uso_terreno">
                <select className={inputClass} value={form.uso_terreno} onChange={(e) => set("uso_terreno", e.target.value)}>
                  <option value="">Não especificado</option>
                  <option value="galpao">Para Galpão</option>
                  <option value="loja">Para Loja</option>
                  <option value="ambos">Galpão e Loja</option>
                </select>
              </FieldVis>
            )}
            <FieldFixo label="Negócio *">
              <select className={inputClass} value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
                <option value="locacao">Locação</option>
                <option value="venda">Venda</option>
                <option value="venda_locacao">Venda e Locação</option>
              </select>
            </FieldFixo>
            <FieldVis label="Valor (R$)" campoChave="valor">
              <input type="number" className={inputClass} value={form.valor} onChange={(e) => set("valor", e.target.value)} />
            </FieldVis>
          </div>
        </section>

        {/* Localização */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Localização</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FieldVis label="Endereço" campoChave="endereco">
                <input className={inputClass} value={form.endereco} onChange={(e) => set("endereco", e.target.value)} />
              </FieldVis>
            </div>
            <FieldVis label="Bairro" campoChave="bairro">
              <input className={inputClass} value={form.bairro} onChange={(e) => set("bairro", e.target.value)} />
            </FieldVis>
            <FieldFixo label="Cidade">
              <input className={inputClass} value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
            </FieldFixo>
            <FieldVis label="CEP" campoChave="cep">
              <input className={inputClass} value={form.cep} onChange={(e) => set("cep", e.target.value)} />
            </FieldVis>
          </div>
        </section>

        {/* Áreas */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Áreas e Dimensões</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <FieldVis label="Área total do terreno (m²)" campoChave="area_total_m2">
              <input type="number" className={inputClass} value={form.area_total_m2} onChange={(e) => set("area_total_m2", e.target.value)} />
            </FieldVis>
            <FieldVis label="Área construída (m²)" campoChave="area_construida_m2">
              <input type="number" className={inputClass} value={form.area_construida_m2} onChange={(e) => set("area_construida_m2", e.target.value)} />
            </FieldVis>
            <FieldVis label="Área de piso operacional (m²)" campoChave="area_piso_m2">
              <input type="number" className={inputClass} value={form.area_piso_m2} onChange={(e) => set("area_piso_m2", e.target.value)} />
            </FieldVis>
            <FieldVis label="Pé direito livre (m)" campoChave="pe_direito_m">
              <input type="number" step="0.1" className={inputClass} value={form.pe_direito_m} onChange={(e) => set("pe_direito_m", e.target.value)} />
            </FieldVis>
          </div>
        </section>

        {/* Infraestrutura */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Infraestrutura</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <FieldVis label="Número de docas" campoChave="numero_docas">
              <input type="number" className={inputClass} value={form.numero_docas} onChange={(e) => set("numero_docas", e.target.value)} />
            </FieldVis>
            <FieldVis label="Potência elétrica (kVA)" campoChave="potencia_eletrica_kva">
              <input type="number" className={inputClass} value={form.potencia_eletrica_kva} onChange={(e) => set("potencia_eletrica_kva", e.target.value)} />
            </FieldVis>
            <FieldVis label="Vagas de estacionamento" campoChave="vagas_estacionamento">
              <input type="number" className={inputClass} value={form.vagas_estacionamento} onChange={(e) => set("vagas_estacionamento", e.target.value)} />
            </FieldVis>
          </div>
          <div className="mt-4 space-y-3">
            <BoolVis label="Acesso para carreta" campoChave="acesso_carreta" field="acesso_carreta" />
            <BoolVis label="Sprinklers" campoChave="sprinklers" field="sprinklers" />
            <BoolVis label="Guarita" campoChave="guarita" field="guarita" />
            <BoolVis label="Condomínio" campoChave="condominio" field="condominio" />
          </div>
          {form.condominio && (
            <div className="mt-4">
              <FieldVis label="Valor do condomínio (R$/mês)" campoChave="valor_condominio">
                <input type="number" className={inputClass} value={form.valor_condominio} onChange={(e) => set("valor_condominio", e.target.value)} />
              </FieldVis>
            </div>
          )}
        </section>

        {/* Descrição */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Descrição e Observações</h2>
          <div className="space-y-4">
            <FieldVis label="Descrição (aparece no site)" campoChave="descricao">
              <textarea rows={4} className={inputClass} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
            </FieldVis>
            <FieldVis label="Observações internas" campoChave="observacoes">
              <textarea rows={3} className={inputClass} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
            </FieldVis>
          </div>
        </section>

        {/* Imagens */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Imagens</h2>
          {existingImagens.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
              {existingImagens.map((img) => (
                <div key={img.id} className="relative border border-gray-200 rounded-sm overflow-hidden">
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gray-100">
                    <img
                      src={`${supabaseUrl}/storage/v1/object/public/galpoes/${img.storage_path}`}
                      alt=""
                      className={`w-full h-full object-cover transition-opacity ${img.visivel_site ? "opacity-100" : "opacity-40"}`}
                    />
                    {img.is_capa && (
                      <span className="absolute top-1.5 left-1.5 bg-[#2e3092] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm leading-none">
                        CAPA
                      </span>
                    )}
                    {!img.visivel_site && (
                      <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-sm leading-none">
                        Oculta
                      </span>
                    )}
                  </div>
                  {/* Ações */}
                  <div className="p-2 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => toggleVisibilidadeSite(img.id, img.visivel_site)}
                      className={`w-full text-[11px] py-1 rounded-sm font-medium transition-colors ${
                        img.visivel_site
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {img.visivel_site ? "No site" : "Oculta"}
                    </button>
                    {form.id && (
                      <button
                        type="button"
                        onClick={() => definirCapa(img.id)}
                        disabled={img.is_capa}
                        className={`w-full text-[11px] py-1 rounded-sm transition-colors ${
                          img.is_capa
                            ? "bg-[#2e3092] text-white cursor-default"
                            : "border border-gray-300 text-gray-600 hover:border-gray-500"
                        }`}
                      >
                        {img.is_capa ? "Capa" : "Definir capa"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImagem(img.id, img.storage_path)}
                      className="w-full text-[11px] py-1 rounded-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} className="text-sm text-gray-600" />
          <p className="mt-1 text-xs text-gray-400">Selecione uma ou mais imagens (JPG, PNG, WEBP)</p>
          {existingImagens.length === 0 && <p className="mt-2 text-xs text-gray-400">Nenhuma imagem cadastrada.</p>}
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="bg-gray-900 text-white px-8 py-2.5 text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando..." : form.id ? "Salvar alterações" : "Cadastrar galpão"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="border border-gray-300 text-gray-600 px-6 py-2.5 text-sm hover:border-gray-500 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>

      {/* Modal de aviso */}
      {warningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-sm shadow-xl max-w-md w-full mx-4 p-6">

            {warningModal.confidenciaisVisiveis.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚠️</span>
                  <h3 className="text-sm font-semibold text-amber-700">Campos confidenciais visíveis</h3>
                </div>
                <ul className="space-y-1">
                  {warningModal.confidenciaisVisiveis.map((item) => (
                    <li key={item} className="text-xs text-gray-600 bg-amber-50 px-3 py-1.5 rounded-sm">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {warningModal.diferentesDopadrao.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">ℹ️</span>
                  <h3 className="text-sm font-semibold text-blue-700">Visibilidade diferente do padrão</h3>
                </div>
                <ul className="space-y-1">
                  {warningModal.diferentesDopadrao.map((item) => (
                    <li key={item.label} className="text-xs text-gray-600 bg-blue-50 px-3 py-1.5 rounded-sm">
                      <span className="font-medium">{item.label}</span> — {item.detalhes}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={doSave}
                className="bg-gray-900 text-white px-5 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Salvar mesmo assim
              </button>
              <button
                onClick={() => setWarningModal(null)}
                className="border border-gray-300 text-gray-600 px-5 py-2 text-sm hover:border-gray-500 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
