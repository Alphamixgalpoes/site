import { createClient } from "@/lib/supabase-server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alphamixgalpoes.com.br";

type CheckItem = {
  titulo: string;
  descricao: string;
  status: "ok" | "atencao" | "pendente";
  link?: { label: string; url: string };
};

export default async function SeoPage() {
  const supabase = await createClient();

  const { data: imoveis } = await supabase
    .from("imoveis")
    .select("id, titulo, descricao, publicado")
    .eq("publicado", true);

  const totalPublicados = imoveis?.length ?? 0;
  const semDescricao = imoveis?.filter((g) => !g.descricao || g.descricao.trim().length < 50).length ?? 0;

  const siteUrlDefinida = !!process.env.NEXT_PUBLIC_SITE_URL;

  const itens: CheckItem[] = [
    {
      titulo: "lang=\"pt-BR\" no HTML",
      descricao: "Informa ao Google que o site é em português. Já corrigido no código.",
      status: "ok",
    },
    {
      titulo: "Metadata (título e descrição)",
      descricao: "Título e descrição da página principal configurados com palavras-chave relevantes.",
      status: "ok",
    },
    {
      titulo: "Open Graph (WhatsApp / LinkedIn)",
      descricao: "Tags Open Graph configuradas. Compartilhamentos mostrarão título, descrição e imagem.",
      status: "ok",
    },
    {
      titulo: "Dados estruturados — Negócio local (JSON-LD)",
      descricao: "Schema.org RealEstateAgent adicionado na página principal. O Google pode exibir informações do negócio nos resultados.",
      status: "ok",
    },
    {
      titulo: "Dados estruturados — Imóveis individuais (JSON-LD)",
      descricao: "Cada página de imóvel tem Schema.org RealEstateListing com preço, área e localização.",
      status: "ok",
    },
    {
      titulo: "Sitemap dinâmico (/sitemap.xml)",
      descricao: `O sitemap é gerado automaticamente com todos os imóveis publicados (${totalPublicados} agora). O Google usa isso para descobrir e indexar suas páginas.`,
      status: "ok",
      link: { label: "Ver sitemap.xml", url: `${siteUrl}/sitemap.xml` },
    },
    {
      titulo: "Robots.txt (/robots.txt)",
      descricao: "Arquivo configurado para permitir indexação das páginas públicas e bloquear /admin e /api.",
      status: "ok",
      link: { label: "Ver robots.txt", url: `${siteUrl}/robots.txt` },
    },
    {
      titulo: "Variável NEXT_PUBLIC_SITE_URL",
      descricao: siteUrlDefinida
        ? `URL do site configurada: ${siteUrl}`
        : "Defina NEXT_PUBLIC_SITE_URL no seu .env.local e no painel do servidor (Vercel). Exemplo: https://www.alphamixgalpoes.com.br",
      status: siteUrlDefinida ? "ok" : "atencao",
    },
    {
      titulo: `Imóveis sem descrição (${semDescricao} de ${totalPublicados})`,
      descricao:
        semDescricao === 0
          ? "Todos os imóveis publicados têm descrição. Ótimo para SEO."
          : `${semDescricao} imóvel(s) publicado(s) sem descrição ou com descrição muito curta. Descrições ajudam o Google a entender o imóvel e melhoram o ranking.`,
      status: semDescricao === 0 ? "ok" : "atencao",
    },
    {
      titulo: "Imagem Open Graph (/og-image.png)",
      descricao: "Adicione uma imagem de 1200×630px chamada og-image.png na pasta /public. Ela aparece quando alguém compartilha o site no WhatsApp ou LinkedIn.",
      status: "pendente",
    },
    {
      titulo: "Google Search Console",
      descricao: "Cadastre o domínio no Google Search Console, verifique a propriedade e envie o sitemap. É gratuito e essencial para o Google indexar seu site.",
      status: "pendente",
      link: { label: "Abrir Google Search Console", url: "https://search.google.com/search-console" },
    },
    {
      titulo: "Google Meu Negócio",
      descricao: "Cadastre a Alphamix Galpões no Google Meu Negócio. Seu negócio aparecerá no Google Maps e nas buscas locais com endereço, telefone e avaliações.",
      status: "pendente",
      link: { label: "Abrir Google Meu Negócio", url: "https://business.google.com" },
    },
    {
      titulo: "Bing Webmaster Tools",
      descricao: "Cadastre o site no Bing para aparecer nas buscas do Bing (que também alimenta o DuckDuckGo e o Copilot da Microsoft).",
      status: "pendente",
      link: { label: "Abrir Bing Webmaster Tools", url: "https://www.bing.com/webmasters" },
    },
  ];

  const contagem = {
    ok: itens.filter((i) => i.status === "ok").length,
    atencao: itens.filter((i) => i.status === "atencao").length,
    pendente: itens.filter((i) => i.status === "pendente").length,
  };

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">SEO — Visibilidade nas buscas</h1>
        <p className="text-sm text-gray-400 mt-1">
          Acompanhe o que já está configurado e o que você precisa fazer para aparecer no Google.
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-green-200 bg-green-50 rounded p-4 text-center">
          <p className="text-2xl font-semibold text-green-700">{contagem.ok}</p>
          <p className="text-xs text-green-600 mt-1">Configurado</p>
        </div>
        <div className="border border-yellow-200 bg-yellow-50 rounded p-4 text-center">
          <p className="text-2xl font-semibold text-yellow-700">{contagem.atencao}</p>
          <p className="text-xs text-yellow-600 mt-1">Atenção</p>
        </div>
        <div className="border border-gray-200 bg-gray-50 rounded p-4 text-center">
          <p className="text-2xl font-semibold text-gray-600">{contagem.pendente}</p>
          <p className="text-xs text-gray-500 mt-1">Pendente</p>
        </div>
      </div>

      {/* Lista de itens */}
      <div className="space-y-2">
        {itens.map((item) => (
          <div
            key={item.titulo}
            className={`border rounded p-4 flex gap-4 items-start ${
              item.status === "ok"
                ? "border-green-100 bg-white"
                : item.status === "atencao"
                ? "border-yellow-200 bg-yellow-50"
                : "border-gray-200 bg-white"
            }`}
          >
            {/* Ícone */}
            <div className="mt-0.5 shrink-0">
              {item.status === "ok" && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs font-bold">✓</span>
              )}
              {item.status === "atencao" && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">!</span>
              )}
              {item.status === "pendente" && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs font-bold">○</span>
              )}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{item.titulo}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.descricao}</p>
              {item.link && (
                <a
                  href={item.link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs text-[#2e3092] underline underline-offset-2 hover:opacity-70"
                >
                  {item.link.label} →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Nota */}
      <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
        Após configurar o Google Search Console e enviar o sitemap, pode levar de 1 a 4 semanas para o Google indexar todas as páginas.
      </p>
    </div>
  );
}
