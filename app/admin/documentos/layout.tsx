"use client";

import { usePathname } from "next/navigation";
import SubNav from "../_components/SubNav";

const lenses = [
  { label: "Emissoes", href: "/admin/documentos/emissoes" },
  { label: "Modelos", href: "/admin/documentos/modelos" },
  { label: "Vencimentos", href: "/admin/documentos/vencimentos" },
];

export default function DocumentosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCentral = pathname === "/admin/documentos";

  return (
    <div>
      {!isCentral && <SubNav items={lenses} />}
      {children}
    </div>
  );
}
