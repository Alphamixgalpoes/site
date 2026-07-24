"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Pin = {
  lat: number;
  lng: number;
  label: string;
  color: string;
};

type Props = {
  pins: Pin[];
  onPinClick?: (index: number) => void;
};

const COLORS: Record<string, string> = {
  new: "#d97706",      // amber
  "#1": "#16a34a",     // green
  "#2": "#2563eb",     // blue
  "#3": "#7c3aed",     // purple
  "#4": "#dc2626",     // red
  "#5": "#6b7280",     // gray
};

function pinIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    className: "",
  });
}

export default function EnrichmentMap({ pins, onPinClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const validPins = pins.filter((p) => p.lat && p.lng);
    if (validPins.length === 0) return;

    const center: [number, number] = [
      validPins.reduce((s, p) => s + p.lat, 0) / validPins.length,
      validPins.reduce((s, p) => s + p.lng, 0) / validPins.length,
    ];

    const map = L.map(mapRef.current, {
      center,
      zoom: 14,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OSM &amp; CARTO",
      maxZoom: 19,
    }).addTo(map);

    validPins.forEach((pin, idx) => {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: pinIcon(pin.color),
        title: pin.label,
      }).addTo(map);

      if (onPinClick) {
        marker.on("click", () => onPinClick(idx));
      }

      marker.bindTooltip(pin.label, { direction: "top", offset: [0, -8] });
    });

    // Fit bounds
    if (validPins.length > 1) {
      const bounds = L.latLngBounds(validPins.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [pins, onPinClick]);

  const hasPins = pins.some((p) => p.lat && p.lng);

  if (!hasPins) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <span className="text-xs text-gray-400">Sem coordenadas</span>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full min-h-[200px]" />;
}
