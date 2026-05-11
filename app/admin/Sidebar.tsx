"use client";

import Link from "next/link";
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
        flex flex-col transform transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Petrus Imóveis</p>
          <p className="text-xs text-gray-400 mt-0.5">Painel do Corretor</p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-gray-400 hover:text-gray-900 transition-colors p-1"
          aria-label="Fechar menu"
        >
          ✕
        </button>
      </div>

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
                  ? "bg-gray-900 text-white font-medium"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200 space-y-1">
        <Link
          href="/admin/galpoes/novo"
          onClick={onClose}
          className="flex items-center px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded transition-colors"
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
