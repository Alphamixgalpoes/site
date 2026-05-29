"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Sidebar from "./Sidebar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.innerWidth >= 768);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">

      <Sidebar open={open} onClose={() => setOpen(false)} />

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className={`flex flex-col min-h-screen transition-all duration-200 ${open ? "md:pl-56" : ""}`}>

        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-[#2e3092] px-4 py-2 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex flex-col gap-1 p-1 text-white/80 hover:text-white transition-colors"
              aria-label="Menu"
            >
              <span className="block w-5 h-0.5 bg-current" />
              <span className="block w-5 h-0.5 bg-current" />
              <span className="block w-5 h-0.5 bg-current" />
            </button>
            <Link href="/admin" className="flex items-center gap-2">
              <Image
                src="/alphamix-logo.png"
                alt="Alphamix Galpões"
                width={40}
                height={40}
                className="object-contain"
              />
              <span className="hidden sm:block text-sm font-semibold text-white">Alphamix Galpões</span>
            </Link>
          </div>
          <span className="text-xs text-white/50">Painel do Corretor</span>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
