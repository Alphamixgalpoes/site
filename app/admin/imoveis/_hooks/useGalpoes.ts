"use client";

import { useEffect, useState, useMemo } from "react";
import { apiGet, apiPatch, apiDelete } from "@/lib/api-client";
import type { ConfigCampo } from "@/lib/visibilidade";

import type { Galpao } from "@/lib/types";
export type { Galpao };

export function useGalpoes() {
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [configCampos, setConfigCampos] = useState<ConfigCampo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [geocodingProgress, setGeocodingProgress] = useState<string | null>(null);

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
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
  const [filtroProprietarioId, setFiltroProprietarioId] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [data, cfg] = await Promise.all([
        apiGet<Galpao[]>("/api/v1/galpoes", { auth: true }),
        apiGet<ConfigCampo[]>("/api/v1/config/campos", { auth: true }),
      ]);
      setGalpoes(data);
      setConfigCampos(cfg);
    } catch (err) {
      console.error("Erro ao carregar galpões:", err);
    } finally {
      setLoading(false);
    }
  }

  const cidades = useMemo(() => {
    const s = new Set(galpoes.map((g) => g.cidade).filter(Boolean));
    return Array.from(s).sort();
  }, [galpoes]);

  const filtrados = useMemo(() => {
    return galpoes.filter((g) => {
      if (filtroCategoria !== "todos" && g.categoria !== filtroCategoria) return false;
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
      if (filtroProprietarioId && g.proprietario_id !== filtroProprietarioId) return false;
      return true;
    });
  }, [galpoes, filtroCategoria, tipo, cidade, soPublicados, comCarreta, comSprinkler, comGuarita, areaMin, areaMax, valorMin, valorMax, docasMin, filtroProprietarioId]);

  const stats = useMemo(() => ({
    total: galpoes.length,
    publicados: galpoes.filter((g) => g.publicado).length,
    ocultos: galpoes.filter((g) => !g.publicado).length,
  }), [galpoes]);

  const filtrosAtivos = useMemo(() => {
    const f: Record<string, string> = {};
    if (filtroCategoria !== "todos") f["Categoria"] = filtroCategoria === "galpao" ? "Galpão" : filtroCategoria === "loja" ? "Loja" : "Terreno";
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
  }, [filtroCategoria, tipo, cidade, areaMin, areaMax, valorMin, valorMax, docasMin, soPublicados, comCarreta, comSprinkler, comGuarita]);

  const temFiltro = Object.keys(filtrosAtivos).length > 0;

  function limpar() {
    setFiltroCategoria("todos"); setTipo("todos"); setCidade("todas");
    setAreaMin(""); setAreaMax(""); setValorMin(""); setValorMax(""); setDocasMin("");
    setSoPublicados(false); setComCarreta(false); setComSprinkler(false); setComGuarita(false);
    setFiltroProprietarioId("");
  }

  async function togglePublicado(id: string, atual: boolean) {
    setGalpoes((prev) => prev.map((g) => g.id === id ? { ...g, publicado: !atual } : g));
    await apiPatch(`/api/v1/galpoes/${id}/toggle-published?current=${atual}`, { auth: true });
  }

  async function geocodificarTodos() {
    const semCoordenadas = galpoes.filter((g) => !g.latitude || !g.longitude);
    if (semCoordenadas.length === 0) {
      setGeocodingProgress("Todos os imóveis já têm coordenadas.");
      setTimeout(() => setGeocodingProgress(null), 3000);
      return;
    }

    for (let i = 0; i < semCoordenadas.length; i++) {
      const g = semCoordenadas[i];
      setGeocodingProgress(`Geocodificando ${i + 1}/${semCoordenadas.length}: ${g.titulo}...`);

      try {
        const { lat, lng } = await apiGet<{ lat: number | null; lng: number | null }>(
          "/api/v1/geocode/forward",
          { auth: true, params: { endereco: g.endereco ?? "", bairro: g.bairro ?? "", cidade: g.cidade ?? "" } },
        );
        if (lat && lng) {
          await apiPatch(`/api/v1/galpoes/${g.id}/coords?lat=${lat}&lng=${lng}`, { auth: true });
          setGalpoes((prev) => prev.map((p) => p.id === g.id ? { ...p, latitude: lat, longitude: lng } : p));
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
    await apiDelete(`/api/v1/galpoes/${id}`, { auth: true });
    setGalpoes((prev) => prev.filter((g) => g.id !== id));
    setDeletingId(null);
  }

  return {
    galpoes, configCampos, loading, deletingId, setDeletingId, geocodingProgress,
    filtroCategoria, setFiltroCategoria,
    tipo, setTipo, cidade, setCidade, cidades,
    areaMin, setAreaMin, areaMax, setAreaMax,
    valorMin, setValorMin, valorMax, setValorMax,
    docasMin, setDocasMin,
    soPublicados, setSoPublicados,
    comCarreta, setComCarreta,
    comSprinkler, setComSprinkler,
    comGuarita, setComGuarita,
    filtrados, stats, filtrosAtivos, temFiltro,
    filtroProprietarioId, setFiltroProprietarioId,
    limpar, togglePublicado, geocodificarTodos, excluir,
  };
}
