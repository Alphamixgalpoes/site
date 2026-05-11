"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.innerWidth >= 768);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Sidebar fixa */}
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {/* Backdrop mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Área de conteúdo */}
      <div className={`flex flex-col min-h-screen transition-all duration-200 ${open ? "md:pl-56" : ""}`}>

        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex flex-col gap-1 p-1 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Menu"
          >
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>
          <span className="text-sm font-semibold text-gray-900">Petrus Imóveis</span>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
