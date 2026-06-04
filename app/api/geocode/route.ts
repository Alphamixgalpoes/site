import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  // Apenas usuários autenticados podem geocodificar
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const endereco = searchParams.get("endereco") ?? "";
  const bairro = searchParams.get("bairro") ?? "";
  const cidade = searchParams.get("cidade") ?? "";
  const cep = searchParams.get("cep") ?? "";

  // Usa structured search do Nominatim (mais confiável que free-form q=)
  const params = new URLSearchParams({
    format: "json",
    limit: "1",
    countrycodes: "br",
  });

  // Monta a rua com número se disponível
  if (endereco) params.set("street", endereco);
  if (cidade) params.set("city", cidade);
  if (cep) {
    // Nominatim espera CEP formatado (XXXXX-XXX)
    const digits = cep.replace(/\D/g, "");
    if (digits.length === 8) {
      params.set("postalcode", `${digits.slice(0, 5)}-${digits.slice(5)}`);
    }
  }
  params.set("country", "Brazil");

  const url = `https://nominatim.openstreetmap.org/search?${params}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "AlphamixGalpoes/1.0 (petrusweb.vercel.app)",
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Nominatim error" }, { status: 502 });
  }

  const data = await res.json();

  // Se structured search falhou e temos CEP, tenta só com CEP
  if (!data.length && cep) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length === 8) {
      const fallbackParams = new URLSearchParams({
        format: "json",
        limit: "1",
        countrycodes: "br",
        postalcode: `${digits.slice(0, 5)}-${digits.slice(5)}`,
        country: "Brazil",
      });
      const fallbackRes = await fetch(
        `https://nominatim.openstreetmap.org/search?${fallbackParams}`,
        { headers: { "User-Agent": "AlphamixGalpoes/1.0 (petrusweb.vercel.app)" } }
      );
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (fallbackData.length) {
          return NextResponse.json({ lat: parseFloat(fallbackData[0].lat), lng: parseFloat(fallbackData[0].lon) });
        }
      }
    }
  }

  if (!data.length) {
    return NextResponse.json({ lat: null, lng: null });
  }

  return NextResponse.json({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
}

// Reverse geocoding: coordenadas → endereço
export async function POST(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { lat, lng } = body;
  if (!lat || !lng) {
    return NextResponse.json({ error: "lat e lng são obrigatórios" }, { status: 400 });
  }

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

  const res = await fetch(url, {
    headers: { "User-Agent": "AlphamixGalpoes/1.0 (petrusweb.vercel.app)" },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Nominatim error" }, { status: 502 });
  }

  const data = await res.json();
  const addr = data.address ?? {};

  return NextResponse.json({
    logradouro: addr.road ?? "",
    bairro: addr.suburb ?? addr.neighbourhood ?? "",
    cidade: addr.city ?? addr.town ?? addr.municipality ?? "",
    uf: addr.state_code?.toUpperCase() ?? addr.state ?? "",
    cep: addr.postcode ?? "",
  });
}
