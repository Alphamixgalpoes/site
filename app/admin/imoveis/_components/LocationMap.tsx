"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

// Fix leaflet default icon (webpack asset issue)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const pinIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24 14 24S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="#2e3092"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`,
  className: "",
  iconSize: [28, 38],
  iconAnchor: [14, 38],
  popupAnchor: [0, -38],
});

// ── FlyToController — flies to new coordinates (only when going from null to value) ──

function FlyToController({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  const prevRef = useRef<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  useEffect(() => {
    const prev = prevRef.current;
    if (lat && lng && (!prev.lat || !prev.lng)) {
      map.flyTo([lat, lng], 16, { duration: 0.8 });
    }
    prevRef.current = { lat, lng };
  }, [lat, lng, map]);

  return null;
}

// ── DraggableMarker ───────────────────────────────────────────────────────────

function DraggableMarker({
  lat,
  lng,
  onDrag,
}: {
  lat: number;
  lng: number;
  onDrag: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  return (
    <Marker
      ref={markerRef}
      position={[lat, lng]}
      icon={pinIcon}
      draggable
      eventHandlers={{
        dragend() {
          const pos = markerRef.current?.getLatLng();
          if (pos) onDrag(pos.lat, pos.lng);
        },
      }}
    />
  );
}

// ── GeomanController — enables polygon drawing inside MapContainer ─────────────

function GeomanController({
  drawing,
  onDrawEnd,
}: {
  drawing: boolean;
  onDrawEnd: (gj: object) => void;
}) {
  const map = useMap();
  const onDrawEndRef = useRef(onDrawEnd);
  onDrawEndRef.current = onDrawEnd;

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = map as any;
    if (!m.pm) return;
    if (drawing) {
      m.pm.enableDraw("Polygon", { snappable: false, allowSelfIntersection: false });
    } else {
      m.pm.disableDraw();
    }
  }, [drawing, map]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = map as any;
    if (!m.pm) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onCreate(e: any) {
      const gj = (e.layer as L.Polygon).toGeoJSON();
      // Remove geoman's own layer — react-leaflet GeoJSON re-renders from state
      map.removeLayer(e.layer);
      m.pm.disableDraw();
      onDrawEndRef.current(gj);
    }

    m.on("pm:create", onCreate);
    return () => m.off("pm:create", onCreate);
  }, [map]);

  return null;
}

// ── LocationMap ───────────────────────────────────────────────────────────────

export type LocationMapProps = {
  lat: number | null;
  lng: number | null;
  geojson: object | null;
  pinConfirmado: boolean;
  onDrag: (lat: number, lng: number) => void;
  onConfirmPin: () => void;
  onUnconfirmPin: () => void;
  onGeojsonChange: (gj: object | null) => void;
};

export default function LocationMap({
  lat,
  lng,
  geojson,
  pinConfirmado,
  onDrag,
  onConfirmPin,
  onUnconfirmPin,
  onGeojsonChange,
}: LocationMapProps) {
  const [drawing, setDrawing] = useState(false);

  const initialCenter: [number, number] = [-23.508, -46.845]; // Alphaville
  const initialZoom = 13;

  function handleDrawEnd(gj: object) {
    onGeojsonChange(gj);
    setDrawing(false);
  }

  return (
    <div className="space-y-3">
      {/* Map container */}
      <div
        className="relative rounded overflow-hidden border border-gray-200"
        style={{ height: 340 }}
      >
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyToController lat={lat} lng={lng} />
          {lat && lng && (
            <DraggableMarker lat={lat} lng={lng} onDrag={onDrag} />
          )}
          {geojson && (
            <GeoJSON
              key={JSON.stringify(geojson)}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data={geojson as any}
              style={{ color: "#2e3092", weight: 2.5, fillOpacity: 0.12 }}
            />
          )}
          <GeomanController drawing={drawing} onDrawEnd={handleDrawEnd} />
        </MapContainer>

        {/* "Fixar pin" button — visible when pin not yet confirmed */}
        {lat && lng && !pinConfirmado && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000]">
            <button
              type="button"
              onClick={onConfirmPin}
              className="bg-[#2e3092] text-white text-sm font-semibold px-6 py-2.5 shadow-lg hover:bg-[#252878] transition-colors whitespace-nowrap"
            >
              Fixar pin aqui
            </button>
          </div>
        )}

        {/* "Reposicionar" — subtle button shown when already confirmed */}
        {lat && lng && pinConfirmado && (
          <div className="absolute bottom-3 left-3 z-[1000]">
            <button
              type="button"
              onClick={onUnconfirmPin}
              className="bg-white/90 border border-gray-300 text-xs text-gray-600 px-3 py-1.5 shadow hover:border-gray-500 transition-colors"
            >
              Reposicionar pin
            </button>
          </div>
        )}

        {/* Confirmed indicator */}
        {lat && lng && pinConfirmado && (
          <div className="absolute top-3 right-3 z-[1000]">
            <span className="bg-green-600 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow">
              Pin fixado
            </span>
          </div>
        )}

        {/* Empty state hint */}
        {!lat && !lng && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center z-[1000] pointer-events-none">
            <div className="bg-white/90 border border-gray-200 text-xs text-gray-500 px-4 py-2 shadow">
              Preencha o CEP para posicionar o pin automaticamente
            </div>
          </div>
        )}
      </div>

      {/* Polygon controls — below map */}
      <div className="flex flex-wrap items-center gap-3">
        {!geojson && !drawing && (
          <button
            type="button"
            onClick={() => setDrawing(true)}
            className="text-xs border border-gray-300 text-gray-600 px-4 py-2 hover:border-gray-500 transition-colors"
          >
            Desenhar polígono do lote
          </button>
        )}
        {!geojson && drawing && (
          <span className="text-xs text-amber-700 font-medium">
            Clique no mapa para criar os pontos. Clique no primeiro ponto para fechar o polígono.
          </span>
        )}
        {geojson && (
          <button
            type="button"
            onClick={() => { onGeojsonChange(null); setDrawing(false); }}
            className="text-xs border border-red-200 text-red-500 px-4 py-2 hover:bg-red-50 transition-colors"
          >
            Apagar polígono
          </button>
        )}
        <span className="text-xs text-gray-400">
          {geojson ? "Polígono salvo" : "Opcional — delimita o lote no mapa"}
        </span>
      </div>
    </div>
  );
}
