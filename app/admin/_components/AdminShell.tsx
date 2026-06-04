"use client";

import Image from "next/image";
import Link from "next/link";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <BottomNav />

      <div className="flex flex-col min-h-screen md:pl-56">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-[#2e3092] px-4 py-2 flex items-center justify-between shadow-md">
          <Link href="/admin/imoveis" className="flex items-center gap-2">
            <Image
              src="/alphamix-logo.png"
              alt="Alphamix Galpoes"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="hidden sm:block text-sm font-semibold text-white">Alphamix Galpoes</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50 hidden sm:block">Painel do Corretor</span>
            <Link
              href="/admin/configuracoes"
              className="text-white/60 hover:text-white transition-colors p-1"
              aria-label="Configuracoes"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 pb-20 md:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
