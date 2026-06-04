"use client";

import dynamic from "next/dynamic";
import { useGalpoes } from "../_hooks/useGalpoes";
import GalpaoFiltros from "../_components/GalpaoFiltros";

const MapaGalpoes = dynamic(() => import("../_components/MapaGalpoes"), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] flex items-center justify-center text-sm text-gray-400 border border-gray-200 bg-gray-50">
      Carregando mapa...
    </div>
  ),
});

export default function ImoveisMapaPage() {
  const {
    loading,
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
  } = useGalpoes();

  const comCoordenadas = filtrados.filter(
    (g): g is typeof g & { latitude: number; longitude: number } =>
      g.latitude !== null && g.longitude !== null
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mapa de Imoveis</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {comCoordenadas.length} imoveis com coordenadas
        </p>
      </div>

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

      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Carregando...</div>
      ) : (
        <MapaGalpoes galpoes={comCoordenadas} />
      )}
    </div>
  );
}
