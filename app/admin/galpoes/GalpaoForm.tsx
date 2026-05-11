"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

type Galpao = {
  id?: string;
  titulo: string;
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
};

const empty: Galpao = {
  titulo: "", tipo: "locacao", valor: "", endereco: "", bairro: "",
  cidade: "Barueri", cep: "", area_total_m2: "", area_construida_m2: "",
  area_piso_m2: "", pe_direito_m: "", numero_docas: "0", acesso_carreta: false,
  potencia_eletrica_kva: "", sprinklers: false, guarita: false,
  vagas_estacionamento: "0", condominio: false, valor_condominio: "",
  descricao: "", observacoes: "",
};

export default function GalpaoForm({ initial, imagens }: {
  initial?: Partial<Galpao> & { id?: string };
  imagens?: { id: string; storage_path: string; ordem: number }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<Galpao>({ ...empty, ...initial });
  const [files, setFiles] = useState<FileList | null>(null);
  const [existingImagens, setExistingImagens] = useState(imagens ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  function set(field: keyof Galpao, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const supabase = createClient();
    const payload = {
      titulo: form.titulo,
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

    // Geocodificar endereço
    if (form.endereco || form.cidade) {
      try {
        const params = new URLSearchParams({
          endereco: form.endereco,
          bairro: form.bairro,
          cidade: form.cidade,
          cep: form.cep,
        });
        const geoRes = await fetch(`/api/geocode?${params}`);
        if (geoRes.ok) {
          const { lat, lng } = await geoRes.json();
          if (lat && lng) {
            await supabase.from("galpoes").update({ latitude: lat, longitude: lng }).eq("id", galpaoId);
          }
        }
      } catch {
        // geocoding optional, ignore errors
      }
    }

    // Upload imagens novas
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
        const path = `${galpaoId}/${Date.now()}-${i}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("galpoes").upload(path, file);
        if (!uploadError) {
          await supabase.from("galpao_imagens").insert({
            galpao_id: galpaoId,
            storage_path: path,
            ordem: existingImagens.length + i,
          });
        }
      }
    }

    router.push("/admin");
    router.refresh();
  }

  async function removeImagem(imagemId: string, path: string) {
    const supabase = createClient();
    await supabase.storage.from("galpoes").remove([path]);
    await supabase.from("galpao_imagens").delete().eq("id", imagemId);
    setExistingImagens((imgs) => imgs.filter((i) => i.id !== imagemId));
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );

  const inputClass = "w-full border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Identificação */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Identificação</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field label="Título interno *">
              <input className={inputClass} value={form.titulo} onChange={(e) => set("titulo", e.target.value)} required />
            </Field>
          </div>
          <Field label="Tipo *">
            <select className={inputClass} value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
              <option value="locacao">Locação</option>
              <option value="venda">Venda</option>
              <option value="venda_locacao">Venda e Locação</option>
            </select>
          </Field>
          <Field label="Valor (R$)">
            <input type="number" className={inputClass} value={form.valor} onChange={(e) => set("valor", e.target.value)} />
          </Field>
        </div>
      </section>

      {/* Localização */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Localização</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field label="Endereço">
              <input className={inputClass} value={form.endereco} onChange={(e) => set("endereco", e.target.value)} />
            </Field>
          </div>
          <Field label="Bairro">
            <input className={inputClass} value={form.bairro} onChange={(e) => set("bairro", e.target.value)} />
          </Field>
          <Field label="Cidade">
            <input className={inputClass} value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
          </Field>
          <Field label="CEP">
            <input className={inputClass} value={form.cep} onChange={(e) => set("cep", e.target.value)} />
          </Field>
        </div>
      </section>

      {/* Áreas */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Áreas e Dimensões</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Área total do terreno (m²)">
            <input type="number" className={inputClass} value={form.area_total_m2} onChange={(e) => set("area_total_m2", e.target.value)} />
          </Field>
          <Field label="Área construída (m²)">
            <input type="number" className={inputClass} value={form.area_construida_m2} onChange={(e) => set("area_construida_m2", e.target.value)} />
          </Field>
          <Field label="Área de piso operacional (m²)">
            <input type="number" className={inputClass} value={form.area_piso_m2} onChange={(e) => set("area_piso_m2", e.target.value)} />
          </Field>
          <Field label="Pé direito livre (m)">
            <input type="number" step="0.1" className={inputClass} value={form.pe_direito_m} onChange={(e) => set("pe_direito_m", e.target.value)} />
          </Field>
        </div>
      </section>

      {/* Infraestrutura */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Infraestrutura</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Número de docas">
            <input type="number" className={inputClass} value={form.numero_docas} onChange={(e) => set("numero_docas", e.target.value)} />
          </Field>
          <Field label="Potência elétrica (kVA)">
            <input type="number" className={inputClass} value={form.potencia_eletrica_kva} onChange={(e) => set("potencia_eletrica_kva", e.target.value)} />
          </Field>
          <Field label="Vagas de estacionamento">
            <input type="number" className={inputClass} value={form.vagas_estacionamento} onChange={(e) => set("vagas_estacionamento", e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            ["acesso_carreta", "Acesso para carreta"],
            ["sprinklers", "Sprinklers"],
            ["guarita", "Guarita"],
            ["condominio", "Condomínio"],
          ] as [keyof Galpao, string][]).map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form[field] as boolean}
                onChange={(e) => set(field, e.target.checked)}
                className="w-4 h-4"
              />
              {label}
            </label>
          ))}
        </div>
        {form.condominio && (
          <div className="mt-4">
            <Field label="Valor do condomínio (R$/mês)">
              <input type="number" className={inputClass} value={form.valor_condominio} onChange={(e) => set("valor_condominio", e.target.value)} />
            </Field>
          </div>
        )}
      </section>

      {/* Descrição */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Descrição e Observações</h2>
        <div className="space-y-4">
          <Field label="Descrição (aparece no site)">
            <textarea rows={4} className={inputClass} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
          </Field>
          <Field label="Observações internas">
            <textarea rows={3} className={inputClass} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </Field>
        </div>
      </section>

      {/* Imagens */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Imagens</h2>
        {existingImagens.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4">
            {existingImagens.map((img) => (
              <div key={img.id} className="relative group">
                <img
                  src={`${supabaseUrl}/storage/v1/object/public/galpoes/${img.storage_path}`}
                  alt=""
                  className="w-24 h-24 object-cover border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeImagem(img.id, img.storage_path)}
                  className="absolute top-1 right-1 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="text-sm text-gray-600"
        />
        <p className="mt-1 text-xs text-gray-400">Selecione uma ou mais imagens (JPG, PNG, WEBP)</p>
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
  );
}
