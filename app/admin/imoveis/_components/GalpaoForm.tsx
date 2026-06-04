"use client";

import { useState, useMemo, createContext, useContext } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { ConfigCampo, OverridesVisibilidade } from "@/lib/visibilidade";
import ContatoPicker from "@/app/admin/_components/ContatoPicker";
import type { ContatoResumido } from "@/lib/types";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import SortableImageCard from "./SortableImageCard";
import { applySetCapa, applyHide, applyShow, applyDragReorder, persistOrder } from "../_lib/imageOrder";

const LocationMap = dynamic(() => import("./LocationMap"), {
  ssr: false,
  loading: () => (
    <div
      className="border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-400"
      style={{ height: 340 }}
    >
      Carregando mapa…
    </div>
  ),
});

// ── Types ────────────────────────────────────────────────────────────────────

type Galpao = {
  id?: string;
  titulo: string;
  categoria: string;
  uso_terreno: string;
  tipo: string;
  valor: string;
  endereco: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  area_total_m2: string;
  area_construida_m2: string;
  area_piso_m2: string;
  pe_direito_m: string;
  numero_docas: string;
  acesso_carreta: boolean;
  potencia_eletrica_kva: string;
  capacidade_piso_ton_m2: string;
  area_escritorio_m2: string;
  truck_court_m: string;
  avcb_numero: string;
  avcb_validade: string;
  sprinklers: boolean;
  sprinkler_tipo: string;
  guarita: boolean;
  acessos_viarios: string;
  video_url: string;
  planta_baixa_url: string;
  vagas_estacionamento: string;
  condominio: boolean;
  valor_condominio: string;
  descricao: string;
  observacoes: string;
  campos_visibilidade?: OverridesVisibilidade;
};

type ImagemExistente = {
  id: string;
  storage_path: string;
  ordem: number;
  visivel_site: boolean;
  is_capa: boolean;
};

type WarningInfo = {
  confidenciaisVisiveis: string[];
  diferentesDopadrao: { label: string; detalhes: string }[];
};

type TabStatus = "empty" | "partial" | "complete";

// ── Constants ─────────────────────────────────────────────────────────────────

const empty: Galpao = {
  titulo: "", categoria: "galpao", uso_terreno: "", tipo: "locacao", valor: "",
  endereco: "", logradouro: "", numero: "", complemento: "", bairro: "",
  cidade: "Barueri", uf: "SP", cep: "",
  area_total_m2: "", area_construida_m2: "", area_piso_m2: "", pe_direito_m: "",
  numero_docas: "0", acesso_carreta: false, potencia_eletrica_kva: "",
  capacidade_piso_ton_m2: "", area_escritorio_m2: "", truck_court_m: "",
  avcb_numero: "", avcb_validade: "", sprinklers: false, sprinkler_tipo: "",
  guarita: false, acessos_viarios: "", video_url: "", planta_baixa_url: "",
  vagas_estacionamento: "0", condominio: false, valor_condominio: "",
  descricao: "", observacoes: "", campos_visibilidade: {},
};

const TABS = ["Identificação", "Localização", "Características", "Mídia", "Revisão"];

// ── Form context (evita re-montagem de campos a cada keystroke) ───────────────

type GalpaoFormCtxType = {
  configCampos: ConfigCampo[];
  visibilidade: OverridesVisibilidade;
  setVis: (campo: string, contexto: "card" | "ficha", valor: boolean) => void;
  form: Galpao;
  set: (field: keyof Galpao, value: string | boolean) => void;
};

const GalpaoFormCtx = createContext<GalpaoFormCtxType>(null as unknown as GalpaoFormCtxType);

const inputClass = "w-full border border-gray-300 px-3 py-3 text-sm text-gray-900 focus:outline-none focus:border-gray-900 rounded-none";
const lockedInputClass = `${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`;
const labelClass = "block text-xs font-medium text-gray-600 mb-1.5";

function FieldFixo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className={labelClass.replace("mb-1.5", "")}>{label}</label>
        <span className="text-xs text-gray-300">📌 sempre visível</span>
      </div>
      {children}
    </div>
  );
}

function FieldVis({ label, campoChave, children }: { label: string; campoChave: string; children: React.ReactNode }) {
  const { configCampos, visibilidade, setVis } = useContext(GalpaoFormCtx);
  const config = configCampos.find((c) => c.campo_chave === campoChave);
  const cardVal = visibilidade[campoChave]?.card ?? config?.visivel_card ?? true;
  const fichaVal = visibilidade[campoChave]?.ficha ?? config?.visivel_ficha ?? true;
  const isConfidencial = config?.confidencial ?? false;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
          {label}{isConfidencial && <span className="text-amber-600 text-xs font-semibold">🔒</span>}
        </label>
        <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0 ml-2">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={cardVal} onChange={(e) => setVis(campoChave, "card", e.target.checked)} className="w-3 h-3 accent-[#2e3092]" />Card
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={fichaVal} onChange={(e) => setVis(campoChave, "ficha", e.target.checked)} className="w-3 h-3 accent-[#2e3092]" />Ficha
          </label>
        </div>
      </div>
      {children}
    </div>
  );
}

function BoolVis({ label, campoChave, field }: { label: string; campoChave: string; field: keyof Galpao }) {
  const { configCampos, visibilidade, setVis, form, set } = useContext(GalpaoFormCtx);
  const config = configCampos.find((c) => c.campo_chave === campoChave);
  const cardVal = visibilidade[campoChave]?.card ?? config?.visivel_card ?? true;
  const fichaVal = visibilidade[campoChave]?.ficha ?? config?.visivel_ficha ?? true;
  const isConfidencial = config?.confidencial ?? false;
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={!!form[field]} onChange={(e) => set(field, e.target.checked)} className="w-4 h-4 accent-[#2e3092]" />
        {label}{isConfidencial && <span className="text-amber-600 text-xs">🔒</span>}
      </label>
      <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={cardVal} onChange={(e) => setVis(campoChave, "card", e.target.checked)} className="w-3 h-3 accent-[#2e3092]" />Card
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={fichaVal} onChange={(e) => setVis(campoChave, "ficha", e.target.checked)} className="w-3 h-3 accent-[#2e3092]" />Ficha
        </label>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-6 first:mt-0">
      {children}
    </h3>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GalpaoForm({
  initial,
  imagens,
  configCampos = [],
}: {
  initial?: Partial<Galpao> & {
    id?: string;
    publicado?: boolean;
    latitude?: number | null;
    longitude?: number | null;
    geojson?: object | null;
    proprietario?: ContatoResumido | null;
    proprietario_id?: string | null;
  };
  imagens?: ImagemExistente[];
  configCampos?: ConfigCampo[];
}) {
  const router = useRouter();

  // ── Form state ───────────────────────────────────────────────────────────
  const [form, setForm] = useState<Galpao>({ ...empty, ...initial });
  const [visibilidade, setVisibilidade] = useState<OverridesVisibilidade>(
    (initial?.campos_visibilidade as OverridesVisibilidade) ?? {}
  );
  const [existingImagens, setExistingImagens] = useState<ImagemExistente[]>(
    (imagens ?? []).map((img) => ({
      ...img,
      visivel_site: img.visivel_site ?? true,
      is_capa: img.is_capa ?? false,
    }))
  );

  // ── Draft / save state ───────────────────────────────────────────────────
  const [draftId] = useState<string>(() => initial?.id ?? crypto.randomUUID());
  const [draftSaved, setDraftSaved] = useState(!!initial?.id);
  const [saving, setSaving] = useState(false);
  const [uploadingImagens, setUploadingImagens] = useState(false);
  const [error, setError] = useState("");
  const [warningModal, setWarningModal] = useState<WarningInfo | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);

  // ── Proprietário state ───────────────────────────────────────────────────
  const [proprietario, setProprietario] = useState<ContatoResumido | null>(
    initial?.proprietario ?? null
  );

  // ── Location state ───────────────────────────────────────────────────────
  const [lat, setLat] = useState<number | null>(initial?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(initial?.longitude ?? null);
  const [pinConfirmado, setPinConfirmado] = useState(!!(initial?.latitude && initial?.longitude));
  const [geojson, setGeojson] = useState<object | null>(initial?.geojson ?? null);

  // ── Publish state ────────────────────────────────────────────────────────
  const [publicado, setPublicado] = useState(initial?.publicado ?? false);

  // ── Navigation ───────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);

  // ── CEP state ────────────────────────────────────────────────────────────
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [enderecoManual, setEnderecoManual] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cepLocked = cepStatus === "found" && !enderecoManual;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function set(field: keyof Galpao, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // ── Tab statuses ─────────────────────────────────────────────────────────

  const tabStatuses = useMemo((): Record<number, TabStatus> => {
    const s1: TabStatus = form.titulo ? "complete" : "empty";

    const s2hasSome = !!(form.cep || form.numero);
    const s2: TabStatus = (form.cep && form.numero && pinConfirmado)
      ? "complete"
      : s2hasSome
      ? "partial"
      : "empty";

    const s3hasSome = !!(
      form.area_construida_m2 || form.area_total_m2 || form.pe_direito_m ||
      form.numero_docas !== "0" || form.acesso_carreta || form.sprinklers ||
      form.guarita || form.potencia_eletrica_kva || form.area_escritorio_m2
    );
    const s3: TabStatus = s3hasSome ? "complete" : "empty";

    const s4: TabStatus = existingImagens.length > 0 ? "partial" : "empty";

    return { 1: s1, 2: s2, 3: s3, 4: s4, 5: "complete" };
  }, [form, pinConfirmado, existingImagens]);

  function tabIndicatorIcon(n: number): string {
    if (n === 5) return "";
    const st = tabStatuses[n];
    const hasError = saveAttempted && (n === 1 || n === 2) && st !== "complete";
    if (hasError) return "!";
    if (st === "complete") return "●";
    if (st === "partial") return "◐";
    return "○";
  }

  function tabIndicatorColor(n: number): string {
    const icon = tabIndicatorIcon(n);
    if (icon === "!") return "text-red-500";
    if (icon === "●") return "text-green-500";
    if (icon === "◐") return "text-amber-500";
    return "text-gray-300";
  }

  // ── Payload builder ───────────────────────────────────────────────────────

  function buildPayload() {
    const overridesFinal: OverridesVisibilidade = {};
    for (const [campo, valores] of Object.entries(visibilidade)) {
      const global = configCampos.find((c) => c.campo_chave === campo);
      if (!global) continue;
      if (valores.card !== global.visivel_card || valores.ficha !== global.visivel_ficha) {
        overridesFinal[campo] = valores;
      }
    }

    return {
      titulo: form.titulo || "Rascunho",
      categoria: form.categoria,
      uso_terreno: form.categoria === "terreno" && form.uso_terreno ? form.uso_terreno : null,
      tipo: form.tipo,
      publicado,
      valor: form.valor ? Number(form.valor) : null,
      logradouro: form.logradouro || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      endereco: [form.logradouro, form.numero].filter(Boolean).join(", ") || form.endereco || null,
      bairro: form.bairro || null,
      cidade: form.cidade,
      uf: form.uf || null,
      cep: form.cep || null,
      latitude: pinConfirmado ? lat : null,
      longitude: pinConfirmado ? lng : null,
      geojson: geojson || null,
      area_total_m2: form.area_total_m2 ? Number(form.area_total_m2) : null,
      area_construida_m2: form.area_construida_m2 ? Number(form.area_construida_m2) : null,
      area_piso_m2: form.area_piso_m2 ? Number(form.area_piso_m2) : null,
      pe_direito_m: form.pe_direito_m ? Number(form.pe_direito_m) : null,
      numero_docas: Number(form.numero_docas),
      acesso_carreta: form.acesso_carreta,
      potencia_eletrica_kva: form.potencia_eletrica_kva ? Number(form.potencia_eletrica_kva) : null,
      capacidade_piso_ton_m2: form.capacidade_piso_ton_m2 ? Number(form.capacidade_piso_ton_m2) : null,
      area_escritorio_m2: form.area_escritorio_m2 ? Number(form.area_escritorio_m2) : null,
      truck_court_m: form.truck_court_m ? Number(form.truck_court_m) : null,
      avcb_numero: form.avcb_numero || null,
      avcb_validade: form.avcb_validade || null,
      sprinklers: form.sprinklers,
      sprinkler_tipo: form.sprinklers && form.sprinkler_tipo ? form.sprinkler_tipo : null,
      guarita: form.guarita,
      acessos_viarios: form.acessos_viarios || null,
      video_url: form.video_url || null,
      planta_baixa_url: form.planta_baixa_url || null,
      vagas_estacionamento: Number(form.vagas_estacionamento),
      condominio: form.condominio,
      valor_condominio: form.valor_condominio ? Number(form.valor_condominio) : null,
      descricao: form.descricao || null,
      observacoes: form.observacoes || null,
      campos_visibilidade: overridesFinal,
      proprietario_id: proprietario?.id ?? null,
      updated_at: new Date().toISOString(),
    };
  }

  // ── Reverse geocode (pin manual → preenche endereço) ─────────────────────

  async function handleManualPlace(placeLat: number, placeLng: number) {
    setLat(placeLat);
    setLng(placeLng);
    setPinConfirmado(false);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: placeLat, lng: placeLng }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setForm((f) => ({
        ...f,
        logradouro: data.logradouro || f.logradouro,
        bairro: data.bairro || f.bairro,
        cidade: data.cidade || f.cidade,
        uf: data.uf || f.uf,
        cep: data.cep || f.cep,
      }));
      if (data.cep) setCepStatus("found");
    } catch { /* silent */ }
  }

  // ── CEP & geocoding ───────────────────────────────────────────────────────

  async function geocodeFromAddress(addr: { logradouro: string; bairro: string; cidade: string; cep: string }) {
    try {
      const enderecoStr = [addr.logradouro, form.numero].filter(Boolean).join(", ");
      const params = new URLSearchParams({
        endereco: enderecoStr, bairro: addr.bairro, cidade: addr.cidade, cep: addr.cep,
      });
      const res = await fetch(`/api/geocode?${params}`);
      if (!res.ok) return;
      const { lat: gLat, lng: gLng } = await res.json();
      if (gLat && gLng) {
        setLat(gLat);
        setLng(gLng);
        setPinConfirmado(false); // User must still confirm
      }
    } catch { /* silent */ }
  }

  async function buscarCep(digits: string) {
    setCepStatus("loading");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) { setCepStatus("not_found"); return; }
      const data = await res.json();
      if (data.erro) { setCepStatus("not_found"); return; }
      const logradouro = data.logradouro || form.logradouro;
      const bairro = data.bairro || form.bairro;
      const cidade = data.localidade || form.cidade;
      const uf = data.uf || form.uf;
      setForm((f) => ({ ...f, logradouro, bairro, cidade, uf }));
      setCepStatus("found");
      geocodeFromAddress({ logradouro, bairro, cidade, cep: digits });
    } catch {
      setCepStatus("not_found");
    }
  }

  function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    set("cep", val);
    setCepStatus("idle");
    setEnderecoManual(false);
    const digits = val.replace(/\D/g, "");
    if (digits.length === 8) buscarCep(digits);
  }

  // ── Draft & auto-save ──────────────────────────────────────────────────────

  async function ensureDraftSaved(): Promise<boolean> {
    if (draftSaved) return true;
    const supabase = createClient();
    const { error: err } = await supabase.from("galpoes").insert({
      id: draftId,
      titulo: form.titulo || "Rascunho",
      categoria: form.categoria,
      tipo: form.tipo,
      cidade: form.cidade,
      publicado: false,
      numero_docas: 0,
      acesso_carreta: false,
      sprinklers: false,
      guarita: false,
      vagas_estacionamento: 0,
      condominio: false,
      campos_visibilidade: {},
    });
    if (err) { setError(`Erro ao inicializar rascunho: ${err.message}`); return false; }
    setDraftSaved(true);
    return true;
  }

  async function handleStepChange(newStep: number) {
    if (newStep === currentStep || newStep < 1 || newStep > 5) return;
    // Auto-save if form has meaningful content
    if (form.titulo || form.cep || draftSaved) {
      setAutoSaving(true);
      try {
        const ok = await ensureDraftSaved();
        if (ok) {
          const supabase = createClient();
          await supabase.from("galpoes").update(buildPayload()).eq("id", draftId);
        }
      } catch { /* silent */ }
      setAutoSaving(false);
    }
    setCurrentStep(newStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Visibility helpers ────────────────────────────────────────────────────

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
        const ctx = [cardEfetivo && "Card", fichaEfetivo && "Ficha"].filter(Boolean).join(" e ");
        confidenciaisVisiveis.push(`${config.label} → ${ctx}`);
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

  // ── Save ──────────────────────────────────────────────────────────────────

  function handleSave() {
    setSaveAttempted(true);
    const avisos = calcularAvisos();
    if (avisos.confidenciaisVisiveis.length > 0 || avisos.diferentesDopadrao.length > 0) {
      setWarningModal(avisos);
      return;
    }
    doSave();
  }

  async function doSave() {
    setSaving(true);
    setError("");
    setWarningModal(null);

    const payload = buildPayload();
    const supabase = createClient();
    const redirectToEdit = !form.id;

    if (draftSaved || form.id) {
      const { error: e } = await supabase.from("galpoes").update(payload).eq("id", draftId);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { error: e } = await supabase.from("galpoes").insert({ id: draftId, ...payload });
      if (e) { setError(e.message); setSaving(false); return; }
      setDraftSaved(true);
    }

    // Geocode if pin not yet confirmed and we have an address
    if (!pinConfirmado && (form.logradouro || form.cidade)) {
      try {
        const params = new URLSearchParams({
          endereco: [form.logradouro, form.numero].filter(Boolean).join(", "),
          bairro: form.bairro,
          cidade: form.cidade,
          cep: form.cep,
        });
        const res = await fetch(`/api/geocode?${params}`);
        if (res.ok) {
          const { lat: gLat, lng: gLng } = await res.json();
          if (gLat && gLng) {
            await supabase.from("galpoes").update({ latitude: gLat, longitude: gLng }).eq("id", draftId);
          }
        }
      } catch { /* optional */ }
    }

    if (redirectToEdit) {
      router.push(`/admin/imoveis/${draftId}/editar`);
    } else {
      router.push("/admin");
    }
    router.refresh();
  }

  // ── Image handlers ────────────────────────────────────────────────────────

  async function handleUploadImagens(fileList: FileList) {
    if (fileList.length === 0) return;
    const ok = await ensureDraftSaved();
    if (!ok) return;
    setUploadingImagens(true);
    setError("");
    const supabase = createClient();
    const novas: ImagemExistente[] = [];
    const proximaOrdem = existingImagens.length;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split(".").pop();
      const path = `${draftId}/${Date.now()}-${i}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("galpoes").upload(path, file);
      if (uploadErr) { setError(`Erro ao enviar ${file.name}: ${uploadErr.message}`); continue; }
      const { data, error: insertErr } = await supabase
        .from("galpao_imagens")
        .insert({ galpao_id: draftId, storage_path: path, ordem: proximaOrdem + i, visivel_site: true, is_capa: false })
        .select("id, storage_path, ordem, visivel_site, is_capa")
        .single();
      if (insertErr) { setError(`Erro ao salvar imagem: ${insertErr.message}`); continue; }
      novas.push(data as ImagemExistente);
    }
    setExistingImagens((prev) => [...prev, ...novas]);
    setUploadingImagens(false);
  }

  async function removeImagem(imagemId: string, path: string) {
    const supabase = createClient();
    await supabase.storage.from("galpoes").remove([path]);
    const { error: delErr } = await supabase.from("galpao_imagens").delete().eq("id", imagemId);
    if (delErr) { setError(`Erro ao excluir imagem: ${delErr.message}`); return; }
    setExistingImagens((imgs) => imgs.filter((i) => i.id !== imagemId));
  }

  async function definirCapa(imagemId: string) {
    const reordenadas = applySetCapa(existingImagens, imagemId);
    setExistingImagens(reordenadas);
    const supabase = createClient();
    await persistOrder(supabase, reordenadas);
  }

  async function toggleVisibilidadeSite(imagemId: string, atual: boolean) {
    const reordenadas = atual
      ? applyHide(existingImagens, imagemId)
      : applyShow(existingImagens, imagemId);
    setExistingImagens(reordenadas);
    const supabase = createClient();
    await persistOrder(supabase, reordenadas);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const reordenadas = applyDragReorder(existingImagens, String(active.id), String(over.id));
    setExistingImagens(reordenadas);
    const supabase = createClient();
    persistOrder(supabase, reordenadas);
  }

  // ── Computed values for Revisão ───────────────────────────────────────────

  const capaImg = existingImagens.find((i) => i.is_capa) || existingImagens[0] || null;
  const capaUrl = capaImg ? `${supabaseUrl}/storage/v1/object/public/galpoes/${capaImg.storage_path}` : null;
  const canPublish = tabStatuses[1] === "complete" && tabStatuses[2] === "complete";

  // ── Render ────────────────────────────────────────────────────────────────

  const ctxValue = { configCampos, visibilidade, setVis, form, set };
  return (
    <GalpaoFormCtx.Provider value={ctxValue}>
    <>
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-gray-200 mb-8 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((label, i) => {
          const n = i + 1;
          const isActive = currentStep === n;
          const icon = tabIndicatorIcon(n);
          const iconColor = tabIndicatorColor(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => handleStepChange(n)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                isActive
                  ? "border-[#2e3092] text-[#2e3092] font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {icon && <span className={`text-xs font-mono leading-none ${iconColor}`}>{icon}</span>}
              {label}
            </button>
          );
        })}
      </div>

      {/* Auto-saving indicator */}
      {autoSaving && (
        <p className="text-xs text-gray-400 mb-4">Salvando rascunho…</p>
      )}

      {/* ── Step 1 — Identificação ── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <FieldFixo label="Título interno *">
              <input
                className={`${inputClass} ${saveAttempted && !form.titulo ? "border-red-400" : ""}`}
                value={form.titulo}
                onChange={(e) => set("titulo", e.target.value)}
                placeholder="Ex: Galpão Alphaville — 3.500 m²"
              />
              {saveAttempted && !form.titulo && (
                <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>
              )}
            </FieldFixo>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldFixo label="Categoria *">
              <select className={inputClass} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
                <option value="galpao">Galpão</option>
                <option value="loja">Loja</option>
                <option value="terreno">Terreno</option>
              </select>
            </FieldFixo>

            <FieldFixo label="Negócio *">
              <select className={inputClass} value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
                <option value="locacao">Locação</option>
                <option value="venda">Venda</option>
                <option value="venda_locacao">Venda e Locação</option>
              </select>
            </FieldFixo>
          </div>

          <ContatoPicker
            label="Proprietário"
            value={proprietario}
            onChange={setProprietario}
            placeholder="Buscar proprietário…"
          />

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

          <FieldVis label="Valor (R$)" campoChave="valor">
            <input
              type="number"
              className={inputClass}
              value={form.valor}
              onChange={(e) => set("valor", e.target.value)}
              placeholder="Ex: 25000"
            />
          </FieldVis>

          <FieldVis label="Descrição (aparece no site)" campoChave="descricao">
            <textarea
              rows={4}
              className={inputClass}
              value={form.descricao}
              onChange={(e) => set("descricao", e.target.value)}
              placeholder="Descreva o imóvel para os visitantes do site…"
            />
          </FieldVis>

          <FieldVis label="Observações internas" campoChave="observacoes">
            <textarea
              rows={3}
              className={inputClass}
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              placeholder="Notas internas, não exibidas no site…"
            />
          </FieldVis>
        </div>
      )}

      {/* ── Step 2 — Localização ── */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <SectionTitle>Endereço</SectionTitle>

          {/* CEP */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass.replace("mb-1.5", "")}>CEP *</label>
                {cepStatus === "loading" && <span className="text-xs text-gray-400">Buscando…</span>}
                {cepStatus === "found" && <span className="text-xs text-green-600 font-medium">Encontrado</span>}
                {cepStatus === "not_found" && <span className="text-xs text-red-500">Não encontrado</span>}
              </div>
              <input
                className={`${inputClass} ${saveAttempted && !form.cep ? "border-red-400" : ""}`}
                value={form.cep}
                onChange={handleCepChange}
                maxLength={9}
                placeholder="00000-000"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass.replace("mb-1.5", "")}>UF</label>
                <span className="text-xs text-gray-300">pelo CEP</span>
              </div>
              <input className={lockedInputClass} value={form.uf} readOnly tabIndex={-1} placeholder="SP" />
            </div>
          </div>

          {cepStatus === "found" && (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xs text-gray-400">
                {enderecoManual ? "Campos desbloqueados para edição." : "Campos preenchidos pelo CEP."}
              </span>
              <button
                type="button"
                onClick={() => setEnderecoManual((v) => !v)}
                className="text-xs text-[#2e3092] underline hover:no-underline shrink-0"
              >
                {enderecoManual ? "Bloquear novamente" : "Editar manualmente"}
              </button>
            </div>
          )}

          {/* Logradouro + Número */}
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <FieldVis label="Logradouro" campoChave="logradouro">
                <input
                  className={cepLocked ? lockedInputClass : inputClass}
                  readOnly={cepLocked}
                  value={form.logradouro}
                  onChange={(e) => set("logradouro", e.target.value)}
                  placeholder="Alameda Grajaú"
                />
              </FieldVis>
            </div>
            <div>
              <FieldVis label="Número *" campoChave="numero">
                <input
                  className={`${inputClass} ${saveAttempted && !form.numero ? "border-red-400" : ""}`}
                  value={form.numero}
                  onChange={(e) => set("numero", e.target.value)}
                  placeholder="500"
                />
              </FieldVis>
            </div>
          </div>

          <FieldVis label="Complemento" campoChave="complemento">
            <input className={inputClass} value={form.complemento} onChange={(e) => set("complemento", e.target.value)} placeholder="Galpão 3, Módulo B…" />
          </FieldVis>

          <div className="grid grid-cols-2 gap-4">
            <FieldVis label="Bairro" campoChave="bairro">
              <input className={cepLocked ? lockedInputClass : inputClass} readOnly={cepLocked} value={form.bairro} onChange={(e) => set("bairro", e.target.value)} />
            </FieldVis>
            <FieldFixo label="Cidade">
              <input className={cepLocked ? lockedInputClass : inputClass} readOnly={cepLocked} value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
            </FieldFixo>
          </div>

          {/* Map */}
          <SectionTitle>Pin no mapa *</SectionTitle>
          {saveAttempted && !pinConfirmado && (
            <p className="text-xs text-red-500 -mt-2 mb-2">Arraste o pin para a posição correta e clique em &ldquo;Fixar pin aqui&rdquo;</p>
          )}
          <LocationMap
            lat={lat}
            lng={lng}
            geojson={geojson}
            pinConfirmado={pinConfirmado}
            onDrag={(newLat, newLng) => { setLat(newLat); setLng(newLng); setPinConfirmado(false); }}
            onConfirmPin={() => setPinConfirmado(true)}
            onUnconfirmPin={() => setPinConfirmado(false)}
            onGeojsonChange={setGeojson}
            onManualPlace={handleManualPlace}
          />
        </div>
      )}

      {/* ── Step 3 — Características ── */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <SectionTitle>Áreas</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <FieldVis label="Área de escritório (m²)" campoChave="area_escritorio_m2">
              <input type="number" className={inputClass} value={form.area_escritorio_m2} onChange={(e) => set("area_escritorio_m2", e.target.value)} />
            </FieldVis>
            <FieldVis label="Truck court (m)" campoChave="truck_court_m">
              <input type="number" step="0.5" className={inputClass} value={form.truck_court_m} onChange={(e) => set("truck_court_m", e.target.value)} />
            </FieldVis>
          </div>

          <SectionTitle>Docas e Acesso</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldVis label="Número de docas" campoChave="numero_docas">
              <input type="number" className={inputClass} value={form.numero_docas} onChange={(e) => set("numero_docas", e.target.value)} />
            </FieldVis>
            <FieldVis label="Vagas de estacionamento" campoChave="vagas_estacionamento">
              <input type="number" className={inputClass} value={form.vagas_estacionamento} onChange={(e) => set("vagas_estacionamento", e.target.value)} />
            </FieldVis>
          </div>
          <div className="space-y-1">
            <BoolVis label="Acesso para carreta" campoChave="acesso_carreta" field="acesso_carreta" />
          </div>

          <SectionTitle>Segurança</SectionTitle>
          <div className="space-y-1">
            <BoolVis label="Sprinklers" campoChave="sprinklers" field="sprinklers" />
            {form.sprinklers && (
              <div className="pl-6 pt-2">
                <FieldVis label="Tipo de sprinkler" campoChave="sprinkler_tipo">
                  <select className={inputClass} value={form.sprinkler_tipo} onChange={(e) => set("sprinkler_tipo", e.target.value)}>
                    <option value="">Não especificado</option>
                    <option value="J4">J4 (padrão)</option>
                    <option value="K25">K25 (especial)</option>
                    <option value="ESFR">ESFR (alta demanda)</option>
                  </select>
                </FieldVis>
              </div>
            )}
            <BoolVis label="Guarita" campoChave="guarita" field="guarita" />
          </div>

          <SectionTitle>Elétrica e Capacidade</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldVis label="Potência elétrica (kVA)" campoChave="potencia_eletrica_kva">
              <input type="number" className={inputClass} value={form.potencia_eletrica_kva} onChange={(e) => set("potencia_eletrica_kva", e.target.value)} />
            </FieldVis>
            <FieldVis label="Capacidade de piso (t/m²)" campoChave="capacidade_piso_ton_m2">
              <input type="number" step="0.5" className={inputClass} value={form.capacidade_piso_ton_m2} onChange={(e) => set("capacidade_piso_ton_m2", e.target.value)} />
            </FieldVis>
          </div>

          <SectionTitle>Condomínio</SectionTitle>
          <div className="space-y-1">
            <BoolVis label="Condomínio" campoChave="condominio" field="condominio" />
          </div>
          {form.condominio && (
            <div className="mt-3">
              <FieldVis label="Valor do condomínio (R$/mês)" campoChave="valor_condominio">
                <input type="number" className={inputClass} value={form.valor_condominio} onChange={(e) => set("valor_condominio", e.target.value)} />
              </FieldVis>
            </div>
          )}

          <SectionTitle>AVCB e Acessos</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldVis label="AVCB nº" campoChave="avcb_numero">
              <input className={inputClass} value={form.avcb_numero} onChange={(e) => set("avcb_numero", e.target.value)} placeholder="Ex: 12345/2024" />
            </FieldVis>
            <FieldVis label="AVCB validade" campoChave="avcb_validade">
              <input type="date" className={inputClass} value={form.avcb_validade} onChange={(e) => set("avcb_validade", e.target.value)} />
            </FieldVis>
          </div>
          <FieldVis label="Acessos viários" campoChave="acessos_viarios">
            <textarea rows={2} className={inputClass} value={form.acessos_viarios} onChange={(e) => set("acessos_viarios", e.target.value)} placeholder="Ex: Rodoanel SP-021 — 3 km, Via Anhanguera — 8 km" />
          </FieldVis>
        </div>
      )}

      {/* ── Step 4 — Mídia ── */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <SectionTitle>Fotos</SectionTitle>

          {existingImagens.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={existingImagens.sort((a, b) => a.ordem - b.ordem).map((i) => i.id)}
                strategy={rectSortingStrategy}
              >
                {/* Mobile: lista vertical, coluna única */}
                <div className="flex flex-col gap-2 sm:hidden">
                  {[...existingImagens].sort((a, b) => a.ordem - b.ordem).map((img) => (
                    <SortableImageCard
                      key={img.id}
                      img={img}
                      supabaseUrl={supabaseUrl ?? ""}
                      draftSaved={draftSaved || !!form.id}
                      onToggleVisibilidade={toggleVisibilidadeSite}
                      onDefinirCapa={definirCapa}
                      onRemove={removeImagem}
                    />
                  ))}
                </div>

                {/* Desktop: grid 3 colunas */}
                <div className="hidden sm:grid grid-cols-3 gap-3">
                  {[...existingImagens].sort((a, b) => a.ordem - b.ordem).map((img) => (
                    <SortableImageCard
                      key={img.id}
                      img={img}
                      supabaseUrl={supabaseUrl ?? ""}
                      draftSaved={draftSaved || !!form.id}
                      onToggleVisibilidade={toggleVisibilidadeSite}
                      onDefinirCapa={definirCapa}
                      onRemove={removeImagem}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <label className={`flex items-center gap-3 w-full border-2 border-dashed border-gray-300 px-5 py-5 cursor-pointer hover:border-gray-400 transition-colors ${uploadingImagens ? "opacity-50 pointer-events-none" : ""}`}>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => e.target.files && handleUploadImagens(e.target.files)}
            />
            <span className="text-2xl text-gray-400">+</span>
            <span className="text-sm text-gray-500">
              {uploadingImagens ? "Enviando…" : existingImagens.length === 0 ? "Adicionar fotos" : "Adicionar mais fotos"}
            </span>
            <span className="ml-auto text-xs text-gray-400">JPG, PNG, WEBP</span>
          </label>

          <SectionTitle>Outros links</SectionTitle>
          <div className="space-y-4">
            <FieldVis label="Vídeo (URL YouTube)" campoChave="video_url">
              <input className={inputClass} value={form.video_url} onChange={(e) => set("video_url", e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
            </FieldVis>
            <FieldVis label="Planta baixa (URL)" campoChave="planta_baixa_url">
              <input className={inputClass} value={form.planta_baixa_url} onChange={(e) => set("planta_baixa_url", e.target.value)} placeholder="https://…" />
            </FieldVis>
          </div>
        </div>
      )}

      {/* ── Step 5 — Revisão ── */}
      {currentStep === 5 && (
        <div className="space-y-6">
          {/* Mini preview */}
          <div className="flex gap-4 p-4 border border-gray-200">
            {capaUrl ? (
              <img src={capaUrl} alt="" className="w-24 h-16 object-cover flex-shrink-0" />
            ) : (
              <div className="w-24 h-16 bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300 text-xs">Sem foto</div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{form.titulo || <span className="text-gray-400 italic">Sem título</span>}</p>
              <p className="text-sm text-gray-500">
                {form.categoria === "galpao" ? "Galpão" : form.categoria === "loja" ? "Loja" : "Terreno"}
                {" · "}
                {form.tipo === "locacao" ? "Locação" : form.tipo === "venda" ? "Venda" : "Venda e Locação"}
              </p>
              {form.valor && (
                <p className="text-sm font-medium text-gray-800">R$ {Number(form.valor).toLocaleString("pt-BR")}</p>
              )}
              <p className="text-xs text-gray-400">
                {[form.bairro, form.cidade].filter(Boolean).join(", ")}
                {form.area_construida_m2 ? ` · ${form.area_construida_m2} m²` : ""}
              </p>
            </div>
          </div>

          {/* Status por etapa */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Status das etapas</p>
            <div className="border border-gray-200 divide-y divide-gray-100">
              {([
                { n: 1, label: "Identificação", required: true },
                { n: 2, label: "Localização", required: true },
                { n: 3, label: "Características", required: false },
                { n: 4, label: "Mídia", required: false },
              ] as { n: 1|2|3|4; label: string; required: boolean }[]).map(({ n, label, required }) => {
                const st = tabStatuses[n];
                const hasError = saveAttempted && required && st !== "complete";
                const icon = hasError ? "!" : st === "complete" ? "●" : st === "partial" ? "◐" : "○";
                const iconColor = hasError ? "text-red-500" : st === "complete" ? "text-green-600" : st === "partial" ? "text-amber-500" : "text-gray-300";
                const statusText = hasError ? "Faltam campos obrigatórios"
                  : st === "complete" ? "Completo"
                  : st === "partial" ? "Parcialmente preenchido"
                  : "Vazio";
                const textColor = hasError ? "text-red-500" : st === "complete" ? "text-green-600" : "text-gray-400";
                return (
                  <div key={n} className="flex items-center justify-between px-4 py-3">
                    <button type="button" onClick={() => handleStepChange(n)} className="flex items-center gap-2.5 text-left hover:underline">
                      <span className={`text-sm font-mono leading-none ${iconColor}`}>{icon}</span>
                      <span className="text-sm text-gray-800">{label}{required && <span className="text-gray-400 ml-0.5"> *</span>}</span>
                    </button>
                    <span className={`text-xs ${textColor}`}>{statusText}</span>
                  </div>
                );
              })}
            </div>

            {existingImagens.length === 0 && (
              <p className="text-xs text-amber-600 mt-2 pl-1">
                Recomendado: adicione pelo menos uma foto na etapa Mídia
              </p>
            )}
          </div>

          {/* Publish toggle */}
          <div className="flex items-center justify-between p-4 border border-gray-200">
            <div>
              <p className="text-sm font-semibold text-gray-900">Publicar no site</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {canPublish
                  ? "Identificação e Localização completas"
                  : "Preencha Identificação e Localização para publicar"}
              </p>
            </div>
            <button
              type="button"
              disabled={!canPublish}
              onClick={() => canPublish && setPublicado((v) => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none disabled:opacity-40 ${
                publicado ? "bg-[#2e3092]" : "bg-gray-300"
              }`}
              aria-label="Toggle publicar"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  publicado ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Validation errors */}
          {saveAttempted && (tabStatuses[1] !== "complete" || tabStatuses[2] !== "complete") && (
            <div className="bg-red-50 border border-red-200 p-4">
              <p className="text-sm font-semibold text-red-700 mb-2">Campos obrigatórios faltando:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-red-600">
                {tabStatuses[1] !== "complete" && <li>Título (etapa Identificação)</li>}
                {!form.cep && <li>CEP (etapa Localização)</li>}
                {!form.numero && <li>Número (etapa Localização)</li>}
                {!pinConfirmado && form.cep && form.numero && <li>Pin de localização não fixado (etapa Localização)</li>}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Save buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-gray-900 text-white px-8 py-3 text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Salvando…" : form.id ? "Salvar alterações" : "Cadastrar imóvel"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="border border-gray-300 text-gray-600 px-6 py-3 text-sm hover:border-gray-500 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom navigation ── */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-8">
        <button
          type="button"
          onClick={() => handleStepChange(currentStep - 1)}
          disabled={currentStep === 1}
          className="text-sm text-gray-600 border border-gray-300 px-5 py-2.5 hover:border-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Anterior
        </button>

        <div className="flex items-center gap-3">
          {autoSaving && <span className="text-xs text-gray-400">Salvando…</span>}
          {currentStep < 5 && (
            <button
              type="button"
              onClick={() => handleStepChange(currentStep + 1)}
              className="bg-gray-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Próxima →
            </button>
          )}
        </div>
      </div>

      {/* ── Warning modal (visibility) ── */}
      {warningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white shadow-xl max-w-md w-full mx-4 p-6">
            {warningModal.confidenciaisVisiveis.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚠️</span>
                  <h3 className="text-sm font-semibold text-amber-700">Campos confidenciais visíveis</h3>
                </div>
                <ul className="space-y-1">
                  {warningModal.confidenciaisVisiveis.map((item) => (
                    <li key={item} className="text-xs text-gray-600 bg-amber-50 px-3 py-1.5">{item}</li>
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
                    <li key={item.label} className="text-xs text-gray-600 bg-blue-50 px-3 py-1.5">
                      <span className="font-medium">{item.label}</span> — {item.detalhes}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={doSave} className="bg-gray-900 text-white px-5 py-2 text-sm font-medium hover:bg-gray-700 transition-colors">
                Salvar mesmo assim
              </button>
              <button onClick={() => setWarningModal(null)} className="border border-gray-300 text-gray-600 px-5 py-2 text-sm hover:border-gray-500 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
    </GalpaoFormCtx.Provider>
  );
}
