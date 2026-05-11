import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endereco = searchParams.get("endereco") ?? "";
  const bairro = searchParams.get("bairro") ?? "";
  const cidade = searchParams.get("cidade") ?? "";
  const cep = searchParams.get("cep") ?? "";

  const parts = [endereco, bairro, cidade, cep, "Brasil"].filter(Boolean);
  const q = parts.join(", ");

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=br`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "PetrusImoveis/1.0 (petrusweb.vercel.app)",
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Nominatim error" }, { status: 502 });
  }

  const data = await res.json();
  if (!data.length) {
    return NextResponse.json({ lat: null, lng: null });
  }

  return NextResponse.json({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
}
