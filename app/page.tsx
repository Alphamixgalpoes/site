import { createClient } from "@/lib/supabase-server";
import PublicHeader from "./PublicHeader";
import GalpoesGrid from "./GalpoesGrid";

export default async function Home() {
  const supabase = await createClient();

  const { data: galpoes } = await supabase
    .from("galpoes")
    .select(`
      id, titulo, tipo, valor, cidade, bairro,
      area_construida_m2, pe_direito_m, numero_docas, acesso_carreta, descricao,
      galpao_imagens (storage_path, ordem)
    `)
    .eq("publicado", true)
    .order("created_at", { ascending: false });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      <PublicHeader />

      {/* Hero */}
      <section className="bg-gray-950 text-white">
        <div className="max-w-6xl mx-auto px-6 py-28 md:py-40">
          <p className="text-sm font-medium tracking-widest text-gray-400 uppercase mb-6">
            Alphaville · Barueri · Tambore
          </p>
          <h1 className="text-4xl md:text-6xl font-semibold leading-tight max-w-3xl">
            Galpoes industriais para venda e locacao
          </h1>
          <p className="mt-6 text-lg text-gray-400 max-w-xl leading-relaxed">
            Atendimento especializado para empresas que buscam espacos logisticos e industriais na regiao metropolitana de Sao Paulo.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <a
              href="#contato"
              className="inline-block bg-white text-gray-900 px-8 py-3 text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Consultar disponibilidade
            </a>
            <a
              href="#servicos"
              className="inline-block border border-gray-600 text-gray-300 px-8 py-3 text-sm font-medium hover:border-gray-400 transition-colors"
            >
              Ver servicos
            </a>
          </div>
        </div>
      </section>

      {/* Numeros */}
      <section className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
          {[
            { value: "15+", label: "Anos de experiencia" },
            { value: "200+", label: "Negocios realizados" },
            { value: "500 mil m²", label: "Em portfolio" },
            { value: "CRECI-SP", label: "Corretor habilitado" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-3xl font-semibold text-gray-900">{item.value}</p>
              <p className="mt-1 text-sm text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Imoveis Publicados */}
      {galpoes && galpoes.length > 0 && (
        <section id="imoveis" className="py-24 bg-white border-t border-gray-200">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">Disponíveis</p>
            <h2 className="text-3xl font-semibold text-gray-900">Imóveis em carteira</h2>
            <GalpoesGrid
              galpoes={galpoes as Parameters<typeof GalpoesGrid>[0]["galpoes"]}
              supabaseUrl={supabaseUrl!}
            />
          </div>
        </section>
      )}

      {/* Servicos */}
      <section id="servicos" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">Servicos</p>
          <h2 className="text-3xl font-semibold text-gray-900 max-w-xl">
            Suporte completo em cada etapa da negociacao
          </h2>
          <div className="mt-14 grid md:grid-cols-3 gap-px bg-gray-200">
            {[
              {
                title: "Locacao Comercial",
                desc: "Intermediacao de contratos de locacao para uso industrial, logistico e comercial. Analise documental completa, garantias e suporte juridico na assinatura.",
              },
              {
                title: "Venda de Galpoes",
                desc: "Avaliacao, apresentacao e negociacao de galpoes para compra. Due diligence documental, acompanhamento de escritura e registro no cartorio.",
              },
              {
                title: "Consultoria Imobiliaria",
                desc: "Analise de mercado, avaliacao de imoveis e orientacao sobre regularizacao de AVCB, Habite-se e documentacao junto as prefeituras de Barueri e Carapicuiba.",
              },
            ].map((s) => (
              <div key={s.title} className="bg-white p-8">
                <h3 className="text-base font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O que buscamos */}
      <section className="py-24 bg-gray-50 border-t border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">Perfil dos imoveis</p>
          <h2 className="text-3xl font-semibold text-gray-900 max-w-xl">
            Galpoes que atendem operacoes reais
          </h2>
          <div className="mt-12 grid md:grid-cols-2 gap-8">
            {[
              { label: "Area", value: "De 500 m² a 50.000 m²" },
              { label: "Pe direito livre", value: "A partir de 8 metros" },
              { label: "Docas e acesso", value: "Com plataformas e acesso para carretas" },
              { label: "Localizacao", value: "Alphaville, Barueri, Tambore, Carapicuiba e entorno" },
              { label: "Documentacao", value: "Habite-se, AVCB e matricula regularizados" },
              { label: "Uso", value: "Industrial, logistico, e-commerce e distribuicao" },
            ].map((item) => (
              <div key={item.label} className="flex gap-6 border-b border-gray-200 pb-6">
                <div className="w-1 bg-gray-900 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{item.label}</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sobre */}
      <section id="sobre" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">Sobre</p>
            <h2 className="text-3xl font-semibold text-gray-900">
              Corretor especializado no mercado industrial
            </h2>
            <p className="mt-6 text-gray-500 leading-relaxed">
              Com atuacao exclusiva no segmento de galpoes industriais, oferecemos um trabalho tecnico e discreto. Conhecemos os imoveis da regiao em profundidade — suas restricoes de uso do solo, historico de ocupacao e documentacao.
            </p>
            <p className="mt-4 text-gray-500 leading-relaxed">
              Trabalhamos com um portfolio selecionado, priorizando negocios bem instruidos e clientes que valorizam seguranca juridica e agilidade.
            </p>
          </div>
          <div className="bg-gray-100 h-72 md:h-96 flex items-end p-8">
            <div>
              <p className="text-2xl font-semibold text-gray-900">Petrus Prime Engineering</p>
              <p className="mt-1 text-sm text-gray-500">Alphaville · Barueri · SP</p>
            </div>
          </div>
        </div>
      </section>

      {/* Regiao */}
      <section id="regiao" className="py-24 bg-gray-950 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">Regiao de Atuacao</p>
          <h2 className="text-3xl font-semibold max-w-xl">
            Conhecimento profundo do mercado local
          </h2>
          <p className="mt-6 text-gray-400 max-w-2xl leading-relaxed">
            Concentramos nossa atuacao no eixo Alphaville—Barueri—Tambore, uma das principais regioes industriais e logisticas do Estado de Sao Paulo, com acesso direto ao Rodoanel, Rodovia Castelo Branco e CETA.
          </p>
          <div className="mt-12 grid sm:grid-cols-3 gap-6">
            {["Alphaville", "Barueri", "Tambore", "Carapicuiba", "Jandira", "Cotia"].map((city) => (
              <div key={city} className="border border-gray-700 px-6 py-4 text-sm text-gray-300">
                {city}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="py-24 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">Contato</p>
            <h2 className="text-3xl font-semibold text-gray-900">
              Entre em contato direto com o corretor
            </h2>
            <p className="mt-6 text-gray-500 leading-relaxed">
              Atendemos empresas que buscam galpoes para locacao ou compra, e proprietarios que desejam comercializar seus imoveis com seguranca e agilidade.
            </p>
            <div className="mt-8 space-y-4 text-sm text-gray-600">
              <p><span className="font-medium text-gray-900">WhatsApp</span> — (11) 99557-1212</p>
              <p><span className="font-medium text-gray-900">E-mail</span> — contato@petrusimóveis.com.br</p>
              <p><span className="font-medium text-gray-900">CRECI-SP</span> — 000000-F</p>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <a
              href="https://wa.me/5511995571212?text=Olá%2C%20gostaria%20de%20informações%20sobre%20galpões%20disponíveis%20na%20Petrus%20Imóveis."
              className="block text-center bg-gray-900 text-white px-8 py-4 text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Conversar pelo WhatsApp
            </a>
            <a
              href="mailto:contato@petrusimoveis.com.br"
              className="block text-center border border-gray-300 text-gray-700 px-8 py-4 text-sm font-medium hover:border-gray-500 transition-colors"
            >
              Enviar e-mail
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-950 text-gray-500">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <p>Petrus Imoveis — Galpoes Industriais · Alphaville e Barueri</p>
          <p>CRECI-SP 000000-F</p>
        </div>
      </footer>

    </div>
  );
}
