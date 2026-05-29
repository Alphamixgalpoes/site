"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

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
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">

        {/* Esquerda — hamburger mobile + nav desktop */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden flex flex-col gap-1 p-1 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Menu"
          >
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>

          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-gray-900 transition-colors">
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Direita — ações + logo */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs border border-[#2e3092] text-[#2e3092] px-3 py-1.5 hover:bg-[#2e3092] hover:text-white transition-colors"
          >
            Área do corretor
          </Link>
          <a
            href="https://wa.me/5511995571212?text=Olá%2C%20vim%20pelo%20site%20da%20Alphamix%20Galpões%20e%20gostaria%20de%20informações."
            className="hidden sm:block text-sm bg-[#ed1c23] text-white px-4 py-2 hover:opacity-90 transition-opacity"
          >
            Fale Conosco
          </a>
          <Image
            src="/alphamix-logo.png"
            alt="Alphamix Galpões"
            width={48}
            height={48}
            className="object-contain"
          />
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-6 py-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block px-6 py-3 text-sm text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Área do corretor
          </Link>
        </div>
      )}
    </header>
  );
}
