"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { tipoLabel } from "@/lib/galpao-utils";

type GalpaoPin = {
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
};

function makeIcon(publicado: boolean) {
  const color = publicado ? "#16a34a" : "#6b7280";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20S24 21 24 12C24 5.373 18.627 0 12 0z" fill="${color}"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
  });
}

export default function MapaGalpoes({ galpoes }: { galpoes: GalpaoPin[] }) {
  const comCoordenadas = galpoes.filter((g) => g.latitude && g.longitude);

  const centro: [number, number] = comCoordenadas.length > 0
    ? [
        comCoordenadas.reduce((s, g) => s + g.latitude, 0) / comCoordenadas.length,
        comCoordenadas.reduce((s, g) => s + g.longitude, 0) / comCoordenadas.length,
      ]
    : [-23.508, -46.845]; // Alphaville default

  return (
    <div className="w-full rounded overflow-hidden border border-gray-200" style={{ height: 520 }}>
      {comCoordenadas.length === 0 ? (
        <div className="flex items-center justify-center h-full text-sm text-gray-400 bg-gray-50">
          Nenhum imóvel com coordenadas. Salve os imóveis para geocodificar automaticamente.
        </div>
      ) : (
        <MapContainer center={centro} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {comCoordenadas.map((g) => (
            <Marker
              key={g.id}
              position={[g.latitude, g.longitude]}
              icon={makeIcon(g.publicado)}
            >
              <Popup minWidth={200}>
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
                    <Link href={`/admin/galpoes/${g.id}`} className="text-xs text-blue-600 hover:underline">
                      Editar
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}
