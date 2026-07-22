"use client";

import { useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, LayersControl, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { tipoLabel } from "@/lib/imovel-utils";

export type ImovelPin = {
  id: string;
  titulo: string;
  tipo: string;
  valor: number | null;
  cidade: string;
  bairro: string | null;
  area_construida_m2: number | null;
  publicado: boolean;
  latitude: number;
  longitude: number;
  geojson?: object | null;
};

type Props = {
  imoveis: ImovelPin[];
  editMode?: boolean;
  onPinDrag?: (id: string, lat: number, lng: number) => void;
  selecionadoId?: string | null;
  onPinClick?: (id: string) => void;
  criarMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  flyToCoord?: { lat: number; lng: number } | null;
  height?: string;
};

// Região padrão: Barueri / Jandira / Cajamar
const DEFAULT_CENTER: [number, number] = [-23.45, -46.88];
const DEFAULT_ZOOM = 12;

function makeIcon(publicado: boolean, selecionado?: boolean) {
  const color = selecionado ? "#2e3092" : publicado ? "#16a34a" : "#6b7280";
  const size = selecionado ? 26 : 20;
  const h = selecionado ? 34 : 26;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 24 32">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20S24 21 24 12C24 5.373 18.627 0 12 0z" fill="${color}"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, h],
    iconAnchor: [size / 2, h],
    popupAnchor: [0, -h],
  });
}

function FitBounds({ imoveis }: { imoveis: ImovelPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (imoveis.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }
    const bounds = L.latLngBounds(imoveis.map((g) => [g.latitude, g.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, imoveis]);
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 0.8 });
  }, [map, lat, lng]);
  return null;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function PopupContent({ g }: { g: ImovelPin }) {
  return (
    <div className="space-y-1.5 py-1">
      <p className="font-semibold text-gray-900 text-sm leading-tight">{g.titulo}</p>
      <p className="text-xs text-gray-500">
        {tipoLabel(g.tipo)}
        {g.area_construida_m2 ? ` · ${g.area_construida_m2} m²` : ""}
      </p>
      {g.valor && (
        <p className="text-xs text-gray-700 font-medium">
          R$ {Number(g.valor).toLocaleString("pt-BR")}
        </p>
      )}
      <p className="text-xs text-gray-400">{[g.bairro, g.cidade].filter(Boolean).join(", ")}</p>
      <div className="flex items-center gap-2 pt-1">
        <span className={`text-xs px-1.5 py-0.5 font-medium ${g.publicado ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {g.publicado ? "Publicado" : "Oculto"}
        </span>
        <Link href={`/admin/imoveis/${g.id}/editar`} className="text-xs text-blue-600 hover:underline">
          Editar
        </Link>
      </div>
    </div>
  );
}

export default function MapaImoveis({
  imoveis,
  editMode = false,
  onPinDrag,
  selecionadoId,
  onPinClick,
  criarMode = false,
  onMapClick,
  flyToCoord,
  height = "520px",
}: Props) {
  const comCoordenadas = imoveis.filter((g) => g.latitude && g.longitude);
  const markerRefs = useRef<Record<string, L.Marker>>({});

  const selecionado = comCoordenadas.find((g) => g.id === selecionadoId);

  const setMarkerRef = useCallback((id: string, ref: L.Marker | null) => {
    if (ref) markerRefs.current[id] = ref;
    else delete markerRefs.current[id];
  }, []);

  // Open popup when selected from list
  useEffect(() => {
    if (selecionadoId && markerRefs.current[selecionadoId]) {
      markerRefs.current[selecionadoId].openPopup();
    }
  }, [selecionadoId]);

  return (
    <div
      className={`w-full rounded overflow-hidden border border-gray-200 ${criarMode ? "cursor-crosshair" : ""}`}
      style={{ height }}
    >
      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Mapa">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satelite">
            <TileLayer
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        <FitBounds imoveis={comCoordenadas} />
        {selecionado && <FlyTo lat={selecionado.latitude} lng={selecionado.longitude} />}
        {flyToCoord && !selecionado && <FlyTo lat={flyToCoord.lat} lng={flyToCoord.lng} />}
        {criarMode && onMapClick && <MapClickHandler onClick={onMapClick} />}

        {/* Pins: mostra apenas se NÃO tem polígono, OU se está selecionado */}
        {comCoordenadas
          .filter((g) => !g.geojson || g.id === selecionadoId)
          .map((g) => (
            <Marker
              key={g.id}
              position={[g.latitude, g.longitude]}
              icon={makeIcon(g.publicado, g.id === selecionadoId)}
              draggable={editMode}
              ref={(ref) => setMarkerRef(g.id, ref)}
              eventHandlers={{
                click: () => onPinClick?.(g.id),
                dragend: (e) => {
                  const latlng = e.target.getLatLng();
                  onPinDrag?.(g.id, latlng.lat, latlng.lng);
                },
              }}
            >
              <Popup minWidth={200}>
                <PopupContent g={g} />
              </Popup>
            </Marker>
          ))}

        {/* Polígonos: clique seleciona o imóvel (revela pin + popup) */}
        {comCoordenadas
          .filter((g) => g.geojson)
          .map((g) => (
            <GeoJSON
              key={`poly-${g.id}`}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data={g.geojson as any}
              style={{
                color: g.id === selecionadoId ? "#2e3092" : g.publicado ? "#16a34a" : "#6b7280",
                weight: 2,
                fillOpacity: g.id === selecionadoId ? 0.2 : 0.1,
              }}
              eventHandlers={{
                click: () => onPinClick?.(g.id),
              }}
            />
          ))}
      </MapContainer>
    </div>
  );
}
