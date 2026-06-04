"use client";

import { usePathname } from "next/navigation";
import SubNav from "../_components/SubNav";

const lenses = [
  { label: "Publicacao", href: "/admin/site/publicacao" },
  { label: "SEO", href: "/admin/site/seo" },
  { label: "Conteudo", href: "/admin/site/conteudo" },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCentral = pathname === "/admin/site";

  return (
    <div>
      {!isCentral && <SubNav items={lenses} />}
      {children}
    </div>
  );
}
