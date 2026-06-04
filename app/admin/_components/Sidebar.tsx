"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const nav = [
  { label: "Imoveis", href: "/admin/imoveis" },
  { label: "Contatos", href: "/admin/contatos" },
  { label: "Negocios", href: "/admin/negocios" },
  { label: "Documentos", href: "/admin/documentos" },
  { label: "Site", href: "/admin/site" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-200 flex-col">
      {/* Header */}
      <div className="bg-[#2e3092] px-4 py-5 flex flex-col items-center gap-3">
        <Image
          src="/alphamix-logo.png"
          alt="Alphamix Galpoes"
          width={64}
          height={64}
          className="object-contain"
        />
        <div className="text-center">
          <p className="text-sm font-bold text-white leading-tight">Alphamix Galpoes</p>
          <p className="text-xs text-white/60 mt-0.5">Painel do Corretor</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2.5 text-sm rounded transition-colors ${
                active
                  ? "bg-[#2e3092] text-white font-medium"
                  : "text-gray-600 hover:bg-gray-100 hover:text-[#2e3092]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-200 space-y-1">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2.5 text-sm text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
