import { createClient } from "@/lib/supabase-server";
import PublicHeader from "./PublicHeader";
import GalpoesGrid from "./GalpoesGrid";
import type { ConfigCampo } from "@/lib/visibilidade";
import { SUPABASE_URL } from "@/lib/constants";

export default async function Home() {
  const supabase = await createClient();

  const [{ data: galpoes }, { data: configCampos }] = await Promise.all([
    supabase
      .from("galpoes")
      .select(`
        id, titulo, tipo, categoria, uso_terreno, valor, cidade, bairro,
        area_construida_m2, area_total_m2, pe_direito_m, numero_docas,
        acesso_carreta, vagas_estacionamento, descricao, campos_visibilidade,
        galpao_imagens (storage_path, ordem, is_capa)
      `)
      .eq("publicado", true)
      .order("created_at", { ascending: false }),
    supabase.from("config_campos").select("*"),
  ]);


  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      <PublicHeader />

      {/* Hero */}
      <section className="relative bg-[#0f1247] text-white overflow-hidden">
        {/* Textura de fundo — substituir por foto quando disponível */}
        {/* TODO: <Image src="/hero-galpao.jpg" alt="" fill className="object-cover opacity-20" priority /> */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1247] via-[#2e3092]/60 to-[#0a0d3a]" />

        <div className="relative max-w-6xl mx-auto px-6 py-40 md:py-56">
          <span className="inline-flex items-center border border-white/20 text-white/50 text-xs font-semibold tracking-widest uppercase px-3 py-1.5 mb-10 rounded-sm">
            Alphaville · Barueri · Tamboré
          </span>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] max-w-4xl tracking-tight">
            Galpões industriais para venda e locação
          </h1>
          <p className="mt-6 text-lg text-white/55 max-w-xl leading-relaxed">
            Atendimento especializado para empresas que buscam espaços logísticos e industriais na região metropolitana de São Paulo.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row gap-3">
            <a
              href="#contato"
              className="inline-flex items-center justify-center bg-white text-[#0f1247] px-8 py-3.5 text-sm font-bold rounded-sm hover:bg-gray-100 transition-colors"
            >
              Consultar disponibilidade
            </a>
            <a
              href="#imoveis"
              className="inline-flex items-center justify-center border border-white/30 text-white/80 px-8 py-3.5 text-sm font-medium rounded-sm hover:border-white hover:text-white transition-colors"
            >
              Ver imóveis
            </a>
          </div>
        </div>
      </section>

      {/* Números */}
      <section className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
          {[
            { value: "15+", label: "Anos de experiência" },
            { value: "200+", label: "Negócios realizados" },
            { value: "500 mil m²", label: "Em portfólio" },
            { value: "CRECI-SP", label: "Corretor habilitado" },
          ].map((item) => (
            <div key={item.label}>
              <div className="w-8 h-0.5 bg-[#2e3092] mb-4" />
              <p className="text-4xl font-bold text-gray-900 tracking-tight">{item.value}</p>
              <p className="mt-2 text-sm text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Imóveis Publicados */}
      {galpoes && galpoes.length > 0 && (
        <section id="imoveis" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Disponíveis</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Imóveis em carteira</h2>
            <GalpoesGrid
              galpoes={galpoes as Parameters<typeof GalpoesGrid>[0]["galpoes"]}
              supabaseUrl={SUPABASE_URL}
              configCampos={(configCampos ?? []) as ConfigCampo[]}
            />
          </div>
        </section>
      )}

      {/* Serviços */}
      <section id="servicos" className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Serviços</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 max-w-xl leading-tight">
            Suporte completo em cada etapa da negociação
          </h2>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "Locação Comercial",
                desc: "Intermediação de contratos de locação para uso industrial, logístico e comercial. Análise documental completa, garantias e suporte jurídico na assinatura.",
              },
              {
                num: "02",
                title: "Venda de Galpões",
                desc: "Avaliação, apresentação e negociação de galpões para compra. Due diligence documental, acompanhamento de escritura e registro no cartório.",
              },
              {
                num: "03",
                title: "Consultoria Imobiliária",
                desc: "Análise de mercado, avaliação de imóveis e orientação sobre regularização de AVCB, Habite-se e documentação junto às prefeituras de Barueri e Carapicuíba.",
              },
            ].map((s) => (
              <div key={s.title} className="bg-white border border-gray-200 p-8 rounded-sm shadow-sm hover:shadow-md transition-shadow">
                <span className="text-xs font-bold text-[#2e3092] tracking-widest">{s.num}</span>
                <h3 className="text-base font-bold text-gray-900 mt-4">{s.title}</h3>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perfil dos imóveis */}
      <section className="py-24 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Perfil dos imóveis</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 max-w-xl leading-tight">
            Galpões que atendem operações reais
          </h2>
          <div className="mt-12 grid md:grid-cols-2 gap-0">
            {[
              { label: "Área", value: "De 500 m² a 50.000 m²" },
              { label: "Pé direito livre", value: "A partir de 8 metros" },
              { label: "Docas e acesso", value: "Com plataformas e acesso para carretas" },
              { label: "Localização", value: "Alphaville, Barueri, Tamboré, Carapicuíba e entorno" },
              { label: "Documentação", value: "Habite-se, AVCB e matrícula regularizados" },
              { label: "Uso", value: "Industrial, logístico, e-commerce e distribuição" },
            ].map((item) => (
              <div key={item.label} className="flex gap-5 py-5 border-b border-gray-200">
                <div className="w-1 bg-[#2e3092] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{item.label}</p>
                  <p className="mt-1.5 text-sm font-semibold text-gray-900">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sobre */}
      <section id="sobre" className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Sobre</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              Corretor especializado no mercado industrial
            </h2>
            <p className="mt-6 text-gray-500 leading-relaxed">
              Com atuação exclusiva no segmento de galpões industriais, oferecemos um trabalho técnico e discreto. Conhecemos os imóveis da região em profundidade — suas restrições de uso do solo, histórico de ocupação e documentação.
            </p>
            <p className="mt-4 text-gray-500 leading-relaxed">
              Trabalhamos com um portfólio selecionado, priorizando negócios bem instruídos e clientes que valorizam segurança jurídica e agilidade.
            </p>
            <div className="mt-8">
              <a
                href="#contato"
                className="inline-flex items-center bg-[#2e3092] text-white px-6 py-3 text-sm font-bold rounded-sm hover:bg-[#252880] transition-colors"
              >
                Falar com o corretor
              </a>
            </div>
          </div>

          {/* Espaço para foto — substituir quando disponível */}
          {/* TODO: <Image src="/foto-corretor.jpg" alt="Corretor Alphamix" fill className="object-cover rounded-sm" /> */}
          <div className="relative bg-gray-900 rounded-sm overflow-hidden h-[340px] md:h-full min-h-[340px]">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-600">
              <div className="w-14 h-14 rounded-full border border-dashed border-gray-700 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-xs tracking-widest uppercase">Foto em breve</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-8 py-6">
              <p className="text-white font-bold text-xl">Alphamix Galpões</p>
              <p className="text-gray-400 text-sm mt-1">Alphaville · Barueri · SP</p>
            </div>
          </div>
        </div>
      </section>

      {/* Região */}
      <section id="regiao" className="py-24 bg-[#0f1247] text-white">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-3">Região de Atuação</p>
          <h2 className="text-3xl md:text-4xl font-bold max-w-xl leading-tight">
            Conhecimento profundo do mercado local
          </h2>
          <p className="mt-6 text-white/50 max-w-2xl leading-relaxed">
            Concentramos nossa atuação no eixo Alphaville—Barueri—Tamboré, uma das principais regiões industriais e logísticas do Estado de São Paulo, com acesso direto ao Rodoanel, Rodovia Castelo Branco e CETA.
          </p>
          <div className="mt-12 grid sm:grid-cols-3 gap-3">
            {["Alphaville", "Barueri", "Tamboré", "Carapicuíba", "Jandira", "Cotia"].map((city) => (
              <div key={city} className="flex items-center gap-3 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors px-5 py-4 rounded-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ed1c23] shrink-0" />
                <span className="text-sm text-white/80">{city}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="py-24 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Contato</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              Entre em contato direto com o corretor
            </h2>
            <p className="mt-6 text-gray-500 leading-relaxed">
              Atendemos empresas que buscam galpões para locação ou compra, e proprietários que desejam comercializar seus imóveis com segurança e agilidade.
            </p>
            <div className="mt-8 space-y-4">
              {[
                {
                  label: "WhatsApp",
                  value: "(11) 99557-1212",
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  ),
                },
                {
                  label: "E-mail",
                  value: "contato@alphamixgalpoes.com.br",
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  ),
                },
                {
                  label: "CRECI-SP",
                  value: "000000-F",
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  ),
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="w-9 h-9 bg-gray-100 rounded-sm flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {item.icon}
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{item.label}</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <a
              href="https://wa.me/5511995571212?text=Olá%2C%20gostaria%20de%20informações%20sobre%20galpões%20disponíveis%20na%20Alphamix%20Galpões."
              className="flex items-center justify-center gap-3 bg-[#25D366] text-white px-8 py-4 text-sm font-bold rounded-sm hover:bg-[#22c55e] transition-colors"
            >
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Conversar pelo WhatsApp
            </a>
            <a
              href="mailto:contato@alphamixgalpoes.com.br"
              className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-8 py-4 text-sm font-medium rounded-sm hover:border-gray-500 hover:text-gray-900 transition-colors"
            >
              Enviar e-mail
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f1247] text-white">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-8">
          <div className="grid md:grid-cols-3 gap-12 pb-12 border-b border-white/10">
            <div>
              <p className="text-lg font-bold">Alphamix Galpões</p>
              <p className="text-white/45 text-sm mt-3 leading-relaxed max-w-xs">
                Especialistas em galpões industriais para venda e locação em Alphaville e Barueri.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-5">Navegação</p>
              <ul className="space-y-2.5">
                {[
                  ["#imoveis", "Imóveis"],
                  ["#servicos", "Serviços"],
                  ["#sobre", "Sobre"],
                  ["#regiao", "Região"],
                  ["#contato", "Contato"],
                ].map(([href, label]) => (
                  <li key={href}>
                    <a href={href} className="text-sm text-white/50 hover:text-white transition-colors">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-5">Contato</p>
              <div className="space-y-2 text-sm text-white/50">
                <p>(11) 99557-1212</p>
                <p>contato@alphamixgalpoes.com.br</p>
                <p className="pt-3 text-white/30 text-xs">CRECI-SP 000000-F</p>
              </div>
            </div>
          </div>
          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/25">
            <p>© {new Date().getFullYear()} Alphamix Galpões — Todos os direitos reservados</p>
            <p>Alphaville · Barueri · SP</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
