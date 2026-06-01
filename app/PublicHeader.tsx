"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { WA_GENERICO } from "@/lib/corretor";

const navLinks = [
  { label: "Imóveis", href: "#imoveis" },
  { label: "Serviços", href: "#servicos" },
  { label: "Sobre", href: "#sobre" },
  { label: "Contato", href: "#contato" },
];

export default function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between gap-6">

        {/* Esquerda — logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="/alphamix-logo.png"
            alt="Alphamix Galpões"
            width={72}
            height={72}
            className="object-contain"
            priority
          />
          <div className="hidden sm:block">
            <p className="text-base font-bold text-[#2e3092] leading-tight">Alphamix Galpões</p>
            <p className="text-xs text-gray-400 tracking-wide">Galpões Industriais</p>
          </div>
        </Link>

        {/* Centro — nav desktop */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hover:text-[#2e3092] transition-colors relative group"
            >
              {l.label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-[#ed1c23] group-hover:w-full transition-all duration-200" />
            </a>
          ))}
        </nav>

        {/* Direita — ações + hamburger mobile */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/login"
            className="hidden sm:block text-xs border border-[#2e3092] text-[#2e3092] px-3 py-1.5 rounded-sm hover:bg-[#2e3092] hover:text-white transition-colors"
          >
            Área do corretor
          </Link>
          <a
            href={WA_GENERICO}
            className="text-sm bg-[#25D366] text-white px-4 py-2 font-semibold rounded-sm hover:bg-[#22c55e] transition-colors"
          >
            Fale Conosco
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden flex flex-col gap-1 p-1 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Menu"
          >
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>
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
              className="block px-6 py-3 text-sm text-gray-600 hover:text-[#2e3092] hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block px-6 py-3 text-sm text-[#2e3092] hover:bg-gray-50 transition-colors"
          >
            Área do corretor
          </Link>
        </div>
      )}
    </header>
  );
}
