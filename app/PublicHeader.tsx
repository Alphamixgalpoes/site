"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
  { label: "Imóveis", href: "#imoveis" },
  { label: "Serviços", href: "#servicos" },
  { label: "Sobre", href: "#sobre" },
  { label: "Contato", href: "#contato" },
];

export default function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-gray-200 sticky top-0 bg-white z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden flex flex-col gap-1 p-1 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Menu"
          >
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>
          <div>
            <span className="text-lg font-semibold tracking-tight text-gray-900">Petrus Imóveis</span>
            <span className="ml-3 text-sm text-gray-400 hidden sm:inline">Galpões Industriais</span>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-gray-900 transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <a
          href="https://wa.me/5511995571212?text=Olá%2C%20vim%20pelo%20site%20da%20Petrus%20Imóveis%20e%20gostaria%20de%20informações."
          className="text-sm bg-gray-900 text-white px-4 py-2 hover:bg-gray-700 transition-colors"
        >
          Fale Conosco
        </a>
      </div>

      {/* Mobile nav dropdown */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-6 py-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
