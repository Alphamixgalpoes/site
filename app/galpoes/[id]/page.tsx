import type { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LeadForm from "./LeadForm";
import GalpoesGrid from "@/app/GalpoesGrid";
import { campoVisivel } from "@/lib/visibilidade";
import type { ConfigCampo, OverridesVisibilidade } from "@/lib/visibilidade";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alphamixgalpoes.com.br";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: g } = await supabase
    .from("galpoes")
    .select("id, titulo, categoria, tipo, cidade, bairro, area_construida_m2, area_total_m2, valor, descricao, galpao_imagens (storage_path, ordem)")
    .eq("id", id)
    .eq("publicado", true)
    .single();

  if (!g) return {};

  const tipoLabel = g.tipo === "venda" ? "Venda" : g.tipo === "locacao" ? "Locação" : "Venda/Locação";
  const categoriaLabel = g.categoria === "loja" ? "Loja" : g.categoria === "terreno" ? "Terreno" : "Galpão";
  const localLabel = g.bairro ? `${g.bairro}, ${g.cidade}` : g.cidade;
  const areaLabel = g.area_construida_m2 ? ` · ${g.area_construida_m2} m²` : "";

  const title = `${categoriaLabel} para ${tipoLabel} — ${localLabel}${areaLabel}`;
  const description = g.descricao
    ? g.descricao.slice(0, 155)
    : `${categoriaLabel} para ${tipoLabel.toLowerCase()} em ${localLabel}. ${g.area_construida_m2 ? `Área construída: ${g.area_construida_m2} m².` : ""} Atendimento direto com corretor especializado — Alphamix Galpões.`;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const imagens = (g.galpao_imagens ?? []).sort(
    (a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem
  );
  const ogImage = imagens[0]
    ? `${supabaseUrl}/storage/v1/object/public/galpoes/${imagens[0].storage_path}`
    : `${siteUrl}/og-image.png`;

  const pageUrl = `${siteUrl}/galpoes/${id}`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: pageUrl,
      siteName: "Alphamix Galpões",
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function GalpaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ categoria?: string; negocio?: string; cidade?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: g }, { data: configCampos }] = await Promise.all([
    supabase
      .from("galpoes")
      .select(`*, galpao_imagens (id, storage_path, ordem)`)
      .eq("id", id)
      .eq("publicado", true)
      .single(),
    supabase.from("config_campos").select("*").order("label"),
  ]);

  if (!g) notFound();

  const { data: todosGalpoes } = await supabase
    .from("galpoes")
    .select("id, titulo, tipo, categoria, uso_terreno, valor, cidade, bairro, area_construida_m2, area_total_m2, pe_direito_m, numero_docas, acesso_carreta, vagas_estacionamento, descricao, campos_visibilidade, galpao_imagens(storage_path, ordem)")
    .eq("publicado", true)
    .order("updated_at", { ascending: false });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const imagens = ([...(g.galpao_imagens ?? [])]).sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem);
  const tipoLabel = g.tipo === "venda" ? "Venda" : g.tipo === "locacao" ? "Locação" : "Venda / Locação";
  const categoriaLabel = g.categoria === "loja" ? "Loja" : g.categoria === "terreno" ? "Terreno" : "Galpão";
  const usoTerrenoLabel = g.uso_terreno === "galpao" ? "Para galpão" : g.uso_terreno === "loja" ? "Para loja" : g.uso_terreno === "ambos" ? "Galpão e loja" : null;

  const cfg = (configCampos ?? []) as ConfigCampo[];
  const overrides = (g.campos_visibilidade ?? {}) as OverridesVisibilidade;
  const cv = (chave: string) => campoVisivel(chave, "ficha", cfg, overrides);

  const fichaItems = [
    { label: "Categoria", value: categoriaLabel },
    cv("uso_terreno") ? { label: "Uso indicado", value: usoTerrenoLabel } : null,
    { label: "Negócio", value: tipoLabel },
    { label: "Cidade", value: g.cidade },
    cv("bairro") ? { label: "Bairro", value: g.bairro } : null,
    cv("endereco") ? { label: "Endereço", value: g.endereco } : null,
    cv("area_total_m2") ? { label: "Área total do terreno", value: g.area_total_m2 ? `${g.area_total_m2} m²` : null } : null,
    cv("area_construida_m2") ? { label: "Área construída", value: g.area_construida_m2 ? `${g.area_construida_m2} m²` : null } : null,
    cv("area_piso_m2") ? { label: "Área de piso", value: g.area_piso_m2 ? `${g.area_piso_m2} m²` : null } : null,
    cv("pe_direito_m") ? { label: "Pé direito livre", value: g.pe_direito_m ? `${g.pe_direito_m} m` : null } : null,
    cv("numero_docas") ? { label: "Docas", value: g.numero_docas > 0 ? `${g.numero_docas}` : null } : null,
    cv("potencia_eletrica_kva") ? { label: "Potência elétrica", value: g.potencia_eletrica_kva ? `${g.potencia_eletrica_kva} kVA` : null } : null,
    cv("vagas_estacionamento") ? { label: "Vagas", value: g.vagas_estacionamento > 0 ? `${g.vagas_estacionamento}` : null } : null,
    cv("acesso_carreta") ? { label: "Acesso para carreta", value: g.acesso_carreta ? "Sim" : null } : null,
    cv("sprinklers") ? { label: "Sprinklers", value: g.sprinklers ? "Sim" : null } : null,
    cv("guarita") ? { label: "Guarita", value: g.guarita ? "Sim" : null } : null,
    cv("condominio") ? { label: "Condomínio", value: g.condominio ? `Sim${g.valor_condominio ? ` — R$ ${Number(g.valor_condominio).toLocaleString("pt-BR")}/mês` : ""}` : null } : null,
  ].filter((i): i is { label: string; value: string | null } => i !== null && i.value !== null && i.value !== undefined);

  // JSON-LD para a página do imóvel
  const primeiraImagem = imagens[0]
    ? `${supabaseUrl}/storage/v1/object/public/galpoes/${imagens[0].storage_path}`
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: g.titulo,
    description: g.descricao ?? undefined,
    url: `${siteUrl}/galpoes/${id}`,
    ...(primeiraImagem && { image: primeiraImagem }),
    ...(g.valor && {
      offers: {
        "@type": "Offer",
        price: g.valor,
        priceCurrency: "BRL",
        priceSpecification: g.tipo === "locacao"
          ? { "@type": "UnitPriceSpecification", billingDuration: "P1M" }
          : undefined,
      },
    }),
    address: {
      "@type": "PostalAddress",
      addressLocality: g.cidade,
      streetAddress: g.bairro ?? undefined,
      addressRegion: "SP",
      addressCountry: "BR",
    },
    ...(g.area_construida_m2 && {
      floorSize: {
        "@type": "QuantitativeValue",
        value: g.area_construida_m2,
        unitCode: "MTK",
      },
    }),
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 bg-white z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/alphamix-logo.png" alt="Alphamix Galpões" width={44} height={44} className="object-contain" />
            <span className="hidden sm:block text-sm font-bold text-[#2e3092]">Alphamix Galpões</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/#imoveis" className="hidden sm:block text-xs text-gray-500 hover:text-gray-900 transition-colors font-medium">
              ← Ver todos os imóveis
            </Link>
            <a
              href="https://wa.me/5511995571212"
              className="text-sm bg-[#25D366] text-white px-4 py-2 rounded-sm font-semibold hover:bg-[#22c55e] transition-colors"
            >
              Fale Conosco
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 md:mb-8">
          <Link href="/#imoveis" className="hover:text-gray-900 transition-colors">Imóveis</Link>
          <span>/</span>
          <span className="text-gray-700 truncate">{g.titulo}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">

          {/* Sidebar — aparece primeiro no mobile */}
          <div className="lg:col-span-1 lg:order-last">
            <div className="border border-gray-200 rounded-sm shadow-sm p-5 md:p-6 lg:sticky lg:top-24">
              <span className="inline-block text-xs font-bold tracking-widest text-[#2e3092] uppercase mb-3">{tipoLabel}</span>
              <h1 className="text-xl font-bold text-gray-900 leading-snug">{g.titulo}</h1>
              <p className="text-sm text-gray-400 mt-1">
                {cv("bairro") && g.bairro ? `${g.bairro}, ` : ""}{g.cidade}
              </p>

              {g.valor && cv("valor") && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{g.tipo === "locacao" ? "Valor mensal" : "Valor"}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    R$ {Number(g.valor).toLocaleString("pt-BR")}
                  </p>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <a
                  href={`https://wa.me/5511995571212?text=${encodeURIComponent(`Olá, tenho interesse no imóvel abaixo e gostaria de mais informações:\n\n*${g.titulo}*\n${tipoLabel} · ${g.cidade}${g.valor ? `\nR$ ${Number(g.valor).toLocaleString("pt-BR")}` : ""}`)}`}
                  className="flex items-center justify-center gap-2.5 bg-[#25D366] text-white px-6 py-3 text-sm font-bold rounded-sm hover:bg-[#22c55e] transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Consultar pelo WhatsApp
                </a>
                <a
                  href="mailto:contato@alphamixgalpoes.com.br"
                  className="flex items-center justify-center border border-gray-300 text-gray-700 px-6 py-3 text-sm font-medium rounded-sm hover:border-gray-500 hover:text-gray-900 transition-colors"
                >
                  Enviar e-mail
                </a>
              </div>

              <p className="mt-5 text-xs text-gray-400 text-center">
                Atendimento direto com o corretor
              </p>

              <LeadForm galpaoId={g.id} galpaoTitulo={g.titulo} />
            </div>
          </div>

          {/* Coluna principal */}
          <div className="lg:col-span-2">

            {/* Galeria */}
            {imagens.length > 0 ? (
              <div className="space-y-2">
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  <img
                    src={`${supabaseUrl}/storage/v1/object/public/galpoes/${imagens[0].storage_path}`}
                    alt={g.titulo}
                    className="w-full h-full object-cover"
                  />
                </div>
                {imagens.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {imagens.slice(1).map((img: { id: string; storage_path: string }) => (
                      <div key={img.id} className="aspect-square bg-gray-100 overflow-hidden">
                        <img
                          src={`${supabaseUrl}/storage/v1/object/public/galpoes/${img.storage_path}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
                Sem imagens
              </div>
            )}

            {/* Descrição */}
            {g.descricao && (
              <div className="mt-8">
                <h2 className="text-base font-bold text-gray-900 mb-3">Descrição</h2>
                <p className="text-gray-500 leading-relaxed whitespace-pre-line">{g.descricao}</p>
              </div>
            )}

            {/* Ficha técnica */}
            <div className="mt-10">
              <h2 className="text-base font-bold text-gray-900 mb-4">Ficha técnica</h2>
              <div className="border border-gray-200 rounded-sm divide-y divide-gray-200 overflow-hidden">
                {fichaItems.map((item) => (
                  <div key={item.label} className="flex flex-col sm:flex-row px-4 py-3.5 gap-0.5 sm:gap-0 hover:bg-gray-50 transition-colors">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 sm:w-48 shrink-0 mt-0.5">{item.label}</span>
                    <span className="text-sm text-gray-900 font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      {/* Continue sua busca */}
      <div className="mt-16 pt-10 border-t border-gray-200 max-w-6xl mx-auto px-4 md:px-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Continue sua busca</h2>
        <GalpoesGrid
          galpoes={(todosGalpoes ?? []) as Parameters<typeof GalpoesGrid>[0]["galpoes"]}
          supabaseUrl={supabaseUrl!}
          initialCategoria={sp.categoria as "galpao" | "loja" | "terreno" | undefined}
          initialNegocio={sp.negocio as "todos" | "venda" | "locacao" | undefined}
          initialCidade={sp.cidade}
          excludeId={id}
          configCampos={cfg}
        />
      </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0f1247] text-white mt-20">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/40">
          <p>© {new Date().getFullYear()} Alphamix Galpões — Galpões Industriais · Alphaville e Barueri</p>
          <p>CRECI-SP 000000-F</p>
        </div>
      </footer>
    </div>
  );
}
