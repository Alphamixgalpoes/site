"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";

export type Galpao = {
  id: string;
  titulo: string;
  tipo: string;
  valor: number | null;
  cidade: string;
  bairro: string | null;
  endereco: string | null;
  publicado: boolean;
  area_construida_m2: number | null;
  area_total_m2: number | null;
  pe_direito_m: number | null;
  numero_docas: number;
  acesso_carreta: boolean;
  sprinklers: boolean;
  guarita: boolean;
  potencia_eletrica_kva: number | null;
  vagas_estacionamento: number;
  descricao: string | null;
  latitude: number | null;
  longitude: number | null;
  galpao_imagens: { storage_path: string; ordem: number }[];
};

export function useGalpoes() {
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [geocodingProgress, setGeocodingProgress] = useState<string | null>(null);

  // Filtros
  const [tipo, setTipo] = useState("todos");
  const [cidade, setCidade] = useState("todas");
  const [areaMin, setAreaMin] = useState("");
  const [areaMax, setAreaMax] = useState("");
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [docasMin, setDocasMin] = useState("");
  const [soPublicados, setSoPublicados] = useState(false);
  const [comCarreta, setComCarreta] = useState(false);
  const [comSprinkler, setComSprinkler] = useState(false);
  const [comGuarita, setComGuarita] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("galpoes")
      .select(`id, titulo, tipo, valor, cidade, bairro, endereco, publicado,
        area_construida_m2, area_total_m2, pe_direito_m, numero_docas,
        acesso_carreta, sprinklers, guarita, potencia_eletrica_kva,
        vagas_estacionamento, descricao, latitude, longitude,
        galpao_imagens (storage_path, ordem)`)
      .order("created_at", { ascending: false });
    setGalpoes(data ?? []);
    setLoading(false);
  }

  const cidades = useMemo(() => {
    const s = new Set(galpoes.map((g) => g.cidade).filter(Boolean));
    return Array.from(s).sort();
  }, [galpoes]);

  const filtrados = useMemo(() => {
    return galpoes.filter((g) => {
      if (tipo !== "todos" && g.tipo !== tipo) return false;
      if (cidade !== "todas" && g.cidade !== cidade) return false;
      if (soPublicados && !g.publicado) return false;
      if (comCarreta && !g.acesso_carreta) return false;
      if (comSprinkler && !g.sprinklers) return false;
      if (comGuarita && !g.guarita) return false;
      if (areaMin && (g.area_construida_m2 ?? 0) < Number(areaMin)) return false;
      if (areaMax && (g.area_construida_m2 ?? 0) > Number(areaMax)) return false;
      if (valorMin && (g.valor ?? 0) < Number(valorMin)) return false;
      if (valorMax && (g.valor ?? 0) > Number(valorMax)) return false;
      if (docasMin && (g.numero_docas ?? 0) < Number(docasMin)) return false;
      return true;
    });
  }, [galpoes, tipo, cidade, soPublicados, comCarreta, comSprinkler, comGuarita, areaMin, areaMax, valorMin, valorMax, docasMin]);

  const stats = useMemo(() => ({
    total: galpoes.length,
    publicados: galpoes.filter((g) => g.publicado).length,
    ocultos: galpoes.filter((g) => !g.publicado).length,
  }), [galpoes]);

  const filtrosAtivos = useMemo(() => {
    const f: Record<string, string> = {};
    if (tipo !== "todos") f["Tipo"] = tipo === "venda" ? "Venda" : tipo === "locacao" ? "Locação" : "Venda/Locação";
    if (cidade !== "todas") f["Cidade"] = cidade;
    if (areaMin) f["Área mín."] = `${areaMin} m²`;
    if (areaMax) f["Área máx."] = `${areaMax} m²`;
    if (valorMin) f["Valor mín."] = `R$ ${Number(valorMin).toLocaleString("pt-BR")}`;
    if (valorMax) f["Valor máx."] = `R$ ${Number(valorMax).toLocaleString("pt-BR")}`;
    if (docasMin) f["Docas mín."] = docasMin;
    if (soPublicados) f["Status"] = "Somente publicados";
    if (comCarreta) f["Acesso carreta"] = "Sim";
    if (comSprinkler) f["Sprinklers"] = "Sim";
    if (comGuarita) f["Guarita"] = "Sim";
    return f;
  }, [tipo, cidade, areaMin, areaMax, valorMin, valorMax, docasMin, soPublicados, comCarreta, comSprinkler, comGuarita]);

  const temFiltro = Object.keys(filtrosAtivos).length > 0;

  function limpar() {
    setTipo("todos"); setCidade("todas"); setAreaMin(""); setAreaMax("");
    setValorMin(""); setValorMax(""); setDocasMin("");
    setSoPublicados(false); setComCarreta(false); setComSprinkler(false); setComGuarita(false);
  }

  async function togglePublicado(id: string, atual: boolean) {
    setGalpoes((prev) => prev.map((g) => g.id === id ? { ...g, publicado: !atual } : g));
    const supabase = createClient();
    await supabase.from("galpoes").update({ publicado: !atual }).eq("id", id);
  }

  async function geocodificarTodos() {
    const semCoordenadas = galpoes.filter((g) => !g.latitude || !g.longitude);
    if (semCoordenadas.length === 0) {
      setGeocodingProgress("Todos os imóveis já têm coordenadas.");
      setTimeout(() => setGeocodingProgress(null), 3000);
      return;
    }

    const supabase = createClient();
    for (let i = 0; i < semCoordenadas.length; i++) {
      const g = semCoordenadas[i];
      setGeocodingProgress(`Geocodificando ${i + 1}/${semCoordenadas.length}: ${g.titulo}...`);

      try {
        const params = new URLSearchParams({
          endereco: g.endereco ?? "",
          bairro: g.bairro ?? "",
          cidade: g.cidade ?? "",
        });
        const res = await fetch(`/api/geocode?${params}`);
        if (res.ok) {
          const { lat, lng } = await res.json();
          if (lat && lng) {
            await supabase.from("galpoes").update({ latitude: lat, longitude: lng }).eq("id", g.id);
            setGalpoes((prev) => prev.map((p) => p.id === g.id ? { ...p, latitude: lat, longitude: lng } : p));
          }
        }
      } catch {
        // ignora erro individual
      }

      if (i < semCoordenadas.length - 1) await new Promise((r) => setTimeout(r, 1100));
    }

    setGeocodingProgress(`Concluído! ${semCoordenadas.length} imóvel(is) processado(s).`);
    setTimeout(() => setGeocodingProgress(null), 4000);
  }

  async function excluir(id: string) {
    const supabase = createClient();
    await supabase.from("galpoes").delete().eq("id", id);
    setGalpoes((prev) => prev.filter((g) => g.id !== id));
    setDeletingId(null);
  }

  return {
    galpoes, loading, deletingId, setDeletingId, geocodingProgress,
    tipo, setTipo, cidade, setCidade, cidades,
    areaMin, setAreaMin, areaMax, setAreaMax,
    valorMin, setValorMin, valorMax, setValorMax,
    docasMin, setDocasMin,
    soPublicados, setSoPublicados,
    comCarreta, setComCarreta,
    comSprinkler, setComSprinkler,
    comGuarita, setComGuarita,
    filtrados, stats, filtrosAtivos, temFiltro,
    limpar, togglePublicado, geocodificarTodos, excluir,
  };
}
