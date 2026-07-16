"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useGalpoes } from "../_hooks/useGalpoes";
import { apiGet, apiPost, apiPatch } from "@/lib/api-client";
import GalpaoFiltros from "../_components/GalpaoFiltros";
import MapaListaItem from "../_components/MapaListaItem";

const MapaGalpoes = dynamic(() => import("../_components/MapaGalpoes"), {
  ssr: false,
  loading: () => (
    <div className="h-[45vh] md:h-[60vh] flex items-center justify-center text-sm text-gray-400 border border-gray-200 bg-gray-50">
      Carregando mapa...
    </div>
  ),
});

export default function MapaHubPage() {
  const router = useRouter();
  const {
    loading, galpoes,
    filtroCategoria, setFiltroCategoria,
    tipo, setTipo, cidade, setCidade, cidades,
    areaMin, setAreaMin, areaMax, setAreaMax,
    valorMin, setValorMin, valorMax, setValorMax,
    docasMin, setDocasMin,
    soPublicados, setSoPublicados,
    comCarreta, setComCarreta,
    comSprinkler, setComSprinkler,
    comGuarita, setComGuarita,
    filtrados, filtrosAtivos, temFiltro, limpar,
    togglePublicado, geocodificarTodos, geocodingProgress,
  } = useGalpoes();

  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [criarMode, setCriarMode] = useState(false);
  const [camadas, setCamadas] = useState({ publicados: true, ocultos: true });
  const [salvando, setSalvando] = useState<string | null>(null);

  // Busca de endereço
  const [busca, setBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [buscaErro, setBuscaErro] = useState("");
  const [flyToCoord, setFlyToCoord] = useState<{ lat: number; lng: number } | null>(null);

  // Filtro de camadas
  const visiveis = filtrados.filter((g) => {
    if (g.publicado && !camadas.publicados) return false;
    if (!g.publicado && !camadas.ocultos) return false;
    return true;
  });

  const comCoordenadas = visiveis.filter(
    (g): g is typeof g & { latitude: number; longitude: number } =>
      g.latitude !== null && g.longitude !== null
  );

  const semCoordenadas = visiveis.filter((g) => g.latitude === null || g.longitude === null);

  async function handlePinDrag(id: string, lat: number, lng: number) {
    setSalvando(id);
    await apiPatch(`/api/v1/galpoes/${id}/coords?lat=${lat}&lng=${lng}`, { auth: true });
    setSalvando(null);
  }

  async function handleMapClick(lat: number, lng: number) {
    setCriarMode(false);
    setSalvando("novo");

    // Reverse geocode para preencher endereço
    let endereco: Record<string, string> = {};
    try {
      endereco = await apiPost<Record<string, string>>(
        "/api/v1/geocode/reverse",
        { lat, lng },
        { auth: true },
      );
    } catch { /* silent */ }

    const data = await apiPost<{ id: string }>("/api/v1/galpoes", {
      titulo: "Novo imovel",
      tipo: "locacao",
      categoria: "galpao",
      cidade: endereco.cidade || "Barueri",
      latitude: lat,
      longitude: lng,
      logradouro: endereco.logradouro || null,
      bairro: endereco.bairro || null,
      uf: endereco.uf || "SP",
      cep: endereco.cep || null,
      publicado: false,
    }, { auth: true });

    setSalvando(null);
    if (data?.id) router.push(`/admin/imoveis/${data.id}/editar`);
  }

  function handleTogglePublicado(id: string, valor: boolean) {
    const g = galpoes.find((g) => g.id === id);
    if (g) togglePublicado(id, g.publicado);
  }

  async function handleBusca(e: React.FormEvent) {
    e.preventDefault();
    if (!busca.trim()) return;
    setBuscando(true);
    setBuscaErro("");
    try {
      const { lat, lng } = await apiGet<{ lat: number | null; lng: number | null }>(
        "/api/v1/geocode/forward",
        { auth: true, params: { endereco: busca.trim() } },
      );
      if (lat && lng) {
        setFlyToCoord({ lat, lng });
        setSelecionadoId(null);
      } else {
        setBuscaErro("Endereco nao encontrado");
      }
    } catch {
      setBuscaErro("Erro na busca");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="space-y-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mapa de Imoveis</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {comCoordenadas.length} com coordenadas
            {semCoordenadas.length > 0 && ` · ${semCoordenadas.length} sem pin`}
          </p>
        </div>

        {/* Filtros */}
        <GalpaoFiltros
          filtroCategoria={filtroCategoria} setFiltroCategoria={setFiltroCategoria}
          tipo={tipo} setTipo={setTipo}
          cidade={cidade} setCidade={setCidade}
          cidades={cidades}
          areaMin={areaMin} setAreaMin={setAreaMin}
          areaMax={areaMax} setAreaMax={setAreaMax}
          valorMin={valorMin} setValorMin={setValorMin}
          valorMax={valorMax} setValorMax={setValorMax}
          docasMin={docasMin} setDocasMin={setDocasMin}
          soPublicados={soPublicados} setSoPublicados={setSoPublicados}
          comCarreta={comCarreta} setComCarreta={setComCarreta}
          comSprinkler={comSprinkler} setComSprinkler={setComSprinkler}
          comGuarita={comGuarita} setComGuarita={setComGuarita}
          temFiltro={temFiltro}
          filtrosAtivos={filtrosAtivos}
          limpar={limpar}
        />

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Busca de endereço */}
          <form onSubmit={handleBusca} className="flex items-center gap-1">
            <input
              type="text"
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setBuscaErro(""); }}
              placeholder="Buscar endereco..."
              className="border border-gray-200 rounded-full px-3 py-1.5 text-xs w-44 focus:outline-none focus:border-gray-400"
            />
            <button
              type="submit"
              disabled={buscando}
              className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-full text-gray-600 hover:border-gray-400 transition-colors disabled:opacity-50"
            >
              {buscando ? "..." : "Ir"}
            </button>
          </form>

          <div className="w-px h-5 bg-gray-200" />

          {/* Camadas */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setCamadas((c) => ({ ...c, publicados: !c.publicados }))}
              className={`px-2.5 py-1.5 border rounded-full transition-colors ${
                camadas.publicados ? "bg-green-50 border-green-300 text-green-700" : "bg-white border-gray-200 text-gray-400"
              }`}
            >
              Publicados
            </button>
            <button
              onClick={() => setCamadas((c) => ({ ...c, ocultos: !c.ocultos }))}
              className={`px-2.5 py-1.5 border rounded-full transition-colors ${
                camadas.ocultos ? "bg-gray-100 border-gray-300 text-gray-700" : "bg-white border-gray-200 text-gray-400"
              }`}
            >
              Ocultos
            </button>
          </div>

          <div className="w-px h-5 bg-gray-200" />

          {/* Modo edição */}
          <button
            onClick={() => { setEditMode((v) => !v); setCriarMode(false); }}
            className={`text-xs px-2.5 py-1.5 border rounded-full transition-colors ${
              editMode ? "bg-[#2e3092] border-[#2e3092] text-white" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            {editMode ? "Editando pins" : "Editar posicoes"}
          </button>

          {/* Criar marcação */}
          <button
            onClick={() => { setCriarMode((v) => !v); setEditMode(false); }}
            className={`text-xs px-2.5 py-1.5 border rounded-full transition-colors ${
              criarMode ? "bg-[#2e3092] border-[#2e3092] text-white" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            {criarMode ? "Clique no mapa..." : "Nova marcacao"}
          </button>

          {/* Geocodificar */}
          {semCoordenadas.length > 0 && (
            <button
              onClick={geocodificarTodos}
              className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-full text-gray-600 hover:border-gray-400 transition-colors"
            >
              Geocodificar ({semCoordenadas.length})
            </button>
          )}
        </div>

        {/* Feedback */}
        {buscaErro && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{buscaErro}</p>
        )}
        {geocodingProgress && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2">{geocodingProgress}</p>
        )}
        {salvando && (
          <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-3 py-2">
            {salvando === "novo" ? "Criando imovel..." : "Salvando posicao..."}
          </p>
        )}
      </div>

      {/* Mapa — sempre visível */}
      {loading ? (
        <div className="h-[45vh] md:h-[60vh] flex items-center justify-center text-sm text-gray-400 border border-gray-200 bg-gray-50">
          Carregando...
        </div>
      ) : (
        <MapaGalpoes
          galpoes={comCoordenadas}
          editMode={editMode}
          onPinDrag={handlePinDrag}
          selecionadoId={selecionadoId}
          onPinClick={setSelecionadoId}
          criarMode={criarMode}
          onMapClick={handleMapClick}
          flyToCoord={flyToCoord}
          height="60vh"
        />
      )}

      {/* Lista de imóveis */}
      {!loading && (
        <div className="mt-4 border border-gray-200 bg-white">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">{visiveis.length} imoveis</p>
            {selecionadoId && (
              <button
                onClick={() => setSelecionadoId(null)}
                className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
              >
                Limpar selecao
              </button>
            )}
          </div>
          <div className="max-h-[40vh] overflow-y-auto">
            {visiveis.map((g) => (
              <MapaListaItem
                key={g.id}
                galpao={g}
                selecionado={g.id === selecionadoId}
                onCentralizar={setSelecionadoId}
                onTogglePublicado={handleTogglePublicado}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
