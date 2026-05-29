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
    <header
      className="sticky top-0 z-50 bg-white shadow-sm"
      style={{ overflow: "visible" }}
    >
      <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between gap-6">

        {/* Logo — overflow para baixo (metade fora do header) */}
        <Link href="/" className="flex items-center gap-3 shrink-0 relative z-10">
          <div className="relative" style={{ marginBottom: "-40px" }}>
            <Image
              src="/alphamix-logo.png"
              alt="Alphamix Galpões"
              width={100}
              height={100}
              className="object-contain drop-shadow-xl"
              priority
            />
          </div>
          <div className="hidden sm:block">
            <p className="text-base font-bold text-[#2e3092] leading-tight">
              Alphamix Galpões
            </p>
            <p className="text-xs text-gray-400 tracking-wide">
              Galpões Industriais
            </p>
          </div>
        </Link>

        {/* Nav — centro */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hover:text-[#2e3092] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTAs — direita */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/login"
            className="hidden sm:block text-xs border border-[#2e3092] text-[#2e3092] px-4 py-2 hover:bg-[#2e3092] hover:text-white transition-colors"
          >
            Área do corretor
          </Link>
          <a
            href="https://wa.me/5511995571212?text=Olá%2C%20vim%20pelo%20site%20da%20Alphamix%20Galpões%20e%20gostaria%20de%20informações."
            className="text-sm bg-[#ed1c23] text-white px-5 py-2 font-medium hover:opacity-90 transition-opacity"
          >
            Fale Conosco
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden flex flex-col gap-1 p-1 text-gray-600"
            aria-label="Menu"
          >
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-6 py-3 text-sm text-gray-600 hover:text-[#2e3092] hover:bg-gray-50 border-b border-gray-100"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block px-6 py-3 text-sm text-[#2e3092] hover:bg-gray-50"
          >
            Área do corretor
          </Link>
        </div>
      )}
    </header>
  );
}
