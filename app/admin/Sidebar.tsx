"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const nav = [
  { label: "Imóveis", href: "/admin" },
  { label: "Contatos", href: "/admin/contatos" },
  { label: "Leads", href: "/admin/leads" },
  { label: "Processos", href: "/admin/processos" },
  { label: "Emissões", href: "/admin/emissoes" },
];

type Props = { open: boolean; onClose: () => void };

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-200
        flex flex-col transform transition-transform duration-200 shadow-lg
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* Cabeçalho azul com logo */}
      <div className="bg-[#2e3092] px-4 py-5 flex flex-col items-center gap-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex-1 flex justify-center">
            <Image
              src="/alphamix-logo.png"
              alt="Alphamix Galpões"
              width={64}
              height={64}
              className="object-contain"
            />
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-white/60 hover:text-white transition-colors p-1 shrink-0"
            aria-label="Fechar menu"
          >
            ✕
          </button>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-white leading-tight">Alphamix Galpões</p>
          <p className="text-xs text-white/60 mt-0.5">Painel do Corretor</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
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
        <Link
          href="/admin/galpoes/novo"
          onClick={onClose}
          className="flex items-center px-3 py-2.5 text-sm font-medium text-[#ed1c23] hover:bg-red-50 rounded transition-colors"
        >
          + Novo Galpão
        </Link>
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
