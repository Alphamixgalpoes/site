"use client";

import { usePathname } from "next/navigation";
import SubNav from "../_components/SubNav";

const lenses = [
  { label: "Lista", href: "/admin/imoveis/lista" },
  { label: "Mapa", href: "/admin/imoveis/mapa" },
  { label: "Consulta", href: "/admin/imoveis/consulta" },
  { label: "Placas", href: "/admin/imoveis/placas" },
];

export default function ImoveisLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCentral = pathname === "/admin/imoveis";
  const isSubPage = pathname.startsWith("/admin/imoveis/novo") ||
    /^\/admin\/imoveis\/[^/]+\/editar/.test(pathname);

  const showSubNav = !isCentral && !isSubPage;

  return (
    <div>
      {showSubNav && <SubNav items={lenses} />}
      {children}
    </div>
  );
}
