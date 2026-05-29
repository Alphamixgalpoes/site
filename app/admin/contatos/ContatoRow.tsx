"use client";

import Link from "next/link";
import { tipoLabel } from "./tipos";

type Contato = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  empresa: string | null;
  tipo_principal: string;
  tags: string[];
};

export default function ContatoRow({ contato }: { contato: Contato }) {
  const tagsExtras = contato.tags.filter((t) => t !== contato.tipo_principal);

  return (
    <Link
      href={`/admin/contatos/${contato.id}`}
      className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
    >
      {/* Inicial */}
      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
        <span className="text-xs font-semibold text-gray-600">
          {contato.nome.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{contato.nome}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {[contato.empresa, contato.telefone].filter(Boolean).join(" · ")}
        </p>
        <div className="flex flex-wrap items-center gap-1 mt-1">
          <span className="text-xs text-gray-400">{tipoLabel(contato.tipo_principal)}</span>
          {tagsExtras.map((t) => (
            <span key={t} className="text-xs border border-gray-200 text-gray-400 px-1.5 py-0.5">
              {tipoLabel(t)}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
