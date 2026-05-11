"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

export default function AdminNav() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold text-gray-900">
            Petrus Imóveis
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Painel
          </Link>
          <Link href="/admin/galpoes/novo" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Novo Galpão
          </Link>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
