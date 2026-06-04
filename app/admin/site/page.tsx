"use client";

import CentralPage from "../_components/CentralPage";

export default function SiteCentral() {
  return (
    <CentralPage
      title="Site"
      subtitle="Gestao da plataforma publica"
      lenses={[
        { label: "Publicacao", href: "/admin/site/publicacao", description: "Gerencie quais imoveis estao visiveis e como aparecem no site" },
        { label: "SEO", href: "/admin/site/seo", description: "Checklist de otimizacao para mecanismos de busca" },
        { label: "Conteudo", href: "/admin/site/conteudo", description: "Textos, imagens e configuracoes da landing page" },
      ]}
    />
  );
}
