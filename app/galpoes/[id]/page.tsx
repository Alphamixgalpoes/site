import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LeadForm from "./LeadForm";

export default async function GalpaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: g } = await supabase
    .from("galpoes")
    .select(`*, galpao_imagens (id, storage_path, ordem)`)
    .eq("id", id)
    .eq("publicado", true)
    .single();

  if (!g) notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const imagens = ([...(g.galpao_imagens ?? [])]).sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem);
  const tipoLabel = g.tipo === "venda" ? "Venda" : g.tipo === "locacao" ? "Locação" : "Venda / Locação";

  const fichaItems = [
    { label: "Tipo", value: tipoLabel },
    { label: "Cidade", value: g.cidade },
    { label: "Bairro", value: g.bairro },
    { label: "Endereço", value: g.endereco },
    { label: "Área total do terreno", value: g.area_total_m2 ? `${g.area_total_m2} m²` : null },
    { label: "Área construída", value: g.area_construida_m2 ? `${g.area_construida_m2} m²` : null },
    { label: "Área de piso", value: g.area_piso_m2 ? `${g.area_piso_m2} m²` : null },
    { label: "Pé direito livre", value: g.pe_direito_m ? `${g.pe_direito_m} m` : null },
    { label: "Docas", value: g.numero_docas > 0 ? `${g.numero_docas}` : null },
    { label: "Potência elétrica", value: g.potencia_eletrica_kva ? `${g.potencia_eletrica_kva} kVA` : null },
    { label: "Vagas", value: g.vagas_estacionamento > 0 ? `${g.vagas_estacionamento}` : null },
    { label: "Acesso para carreta", value: g.acesso_carreta ? "Sim" : null },
    { label: "Sprinklers", value: g.sprinklers ? "Sim" : null },
    { label: "Guarita", value: g.guarita ? "Sim" : null },
    { label: "Condomínio", value: g.condominio ? `Sim${g.valor_condominio ? ` — R$ ${Number(g.valor_condominio).toLocaleString("pt-BR")}/mês` : ""}` : null },
  ].filter((i) => i.value);

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 bg-white z-50">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <a
            href="https://wa.me/5511995571212"
            className="text-sm bg-[#ed1c23] text-white px-4 py-2 hover:opacity-90 transition-opacity"
          >
            Fale Conosco
          </a>
          <Link href="/">
            <Image src="/alphamix-logo.png" alt="Alphamix Galpões" width={48} height={48} className="object-contain" />
          </Link>
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
            <div className="border border-gray-200 p-5 md:p-6 lg:sticky lg:top-24">
              <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">{tipoLabel}</p>
              <h1 className="text-xl font-semibold text-gray-900">{g.titulo}</h1>
              <p className="text-sm text-gray-400 mt-1">{g.bairro ? `${g.bairro}, ` : ""}{g.cidade}</p>

              {g.valor && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-400">{g.tipo === "locacao" ? "Valor mensal" : "Valor"}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    R$ {Number(g.valor).toLocaleString("pt-BR")}
                  </p>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <a
                  href={`https://wa.me/5511995571212?text=${encodeURIComponent(`Olá, tenho interesse no imóvel abaixo e gostaria de mais informações:\n\n*${g.titulo}*\n${tipoLabel} · ${g.cidade}${g.valor ? `\nR$ ${Number(g.valor).toLocaleString("pt-BR")}` : ""}`)}`}
                  className="block text-center bg-[#ed1c23] text-white px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Consultar pelo WhatsApp
                </a>
                <a
                  href="mailto:contato@alphamixgalpoes.com.br"
                  className="block text-center border border-gray-300 text-gray-700 px-6 py-3 text-sm font-medium hover:border-gray-500 transition-colors"
                >
                  Enviar e-mail
                </a>
              </div>

              <p className="mt-6 text-xs text-gray-400 text-center">
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
                <h2 className="text-base font-semibold text-gray-900 mb-3">Descrição</h2>
                <p className="text-gray-500 leading-relaxed whitespace-pre-line">{g.descricao}</p>
              </div>
            )}

            {/* Ficha técnica */}
            <div className="mt-10">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Ficha técnica</h2>
              <div className="border border-gray-200 divide-y divide-gray-200">
                {fichaItems.map((item) => (
                  <div key={item.label} className="flex flex-col sm:flex-row px-4 py-3 gap-0.5 sm:gap-0">
                    <span className="text-xs sm:text-sm text-gray-400 sm:w-44 shrink-0">{item.label}</span>
                    <span className="text-sm text-gray-900 font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-[#2e3092] text-white/60 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <p>Alphamix Galpões — Galpões Industriais · Alphaville e Barueri</p>
          <p>CRECI-SP 000000-F</p>
        </div>
      </footer>
    </div>
  );
}
