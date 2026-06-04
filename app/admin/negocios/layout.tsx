"use client";

import { usePathname } from "next/navigation";
import SubNav from "../_components/SubNav";

const lenses = [
  { label: "Leads", href: "/admin/negocios/leads" },
  { label: "Pipeline", href: "/admin/negocios/pipeline" },
  { label: "Concluidos", href: "/admin/negocios/concluidos" },
];

export default function NegociosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCentral = pathname === "/admin/negocios";

  return (
    <div>
      {!isCentral && <SubNav items={lenses} />}
      {children}
    </div>
  );
}
