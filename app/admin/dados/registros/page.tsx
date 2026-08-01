"use client";

import { useState } from "react";
import { useRegistros, type Registro } from "../_hooks/useRegistros";

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RegistroCard({
  registro,
  onDelete,
  onLoadImage,
}: {
  registro: Registro;
  onDelete: (id: string) => void;
  onLoadImage: (registroId: string, path: string) => Promise<string>;
}) {
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fotos = registro.arquivos.filter((a) => a.tipo === "foto");

  async function carregarFotos() {
    if (loadingImages || fotos.length === 0) return;
    setLoadingImages(true);
    const urls: Record<string, string> = {};
    for (const foto of fotos) {
      try {
        urls[foto.id] = await onLoadImage(registro.id, foto.storage_path);
      } catch {
        /* ignore */
      }
    }
    setImageUrls(urls);
    setLoadingImages(false);
  }

  return (
    <div className="bg-white border border-gray-200 p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="text-xs text-gray-400">{formatDate(registro.created_at)}</span>
          <span className="ml-2 text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500">
            {registro.status}
          </span>
        </div>
        <div className="flex gap-2">
          {fotos.length > 0 && !Object.keys(imageUrls).length && (
            <button
              onClick={carregarFotos}
              disabled={loadingImages}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40"
            >
              {loadingImages ? "Carregando..." : `Ver ${fotos.length} foto(s)`}
            </button>
          )}
          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                onClick={() => onDelete(registro.id)}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-gray-400 hover:text-red-600"
            >
              Excluir
            </button>
          )}
        </div>
      </div>

      {registro.texto && (
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{registro.texto}</p>
      )}

      {Object.keys(imageUrls).length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fotos.map((foto) =>
            imageUrls[foto.id] ? (
              <img
                key={foto.id}
                src={imageUrls[foto.id]}
                alt={foto.nome || "foto"}
                className="h-40 object-cover border border-gray-100 shrink-0"
              />
            ) : null,
          )}
        </div>
      )}

      {registro.metadata && Object.keys(registro.metadata).length > 0 && (
        <details className="text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-600">Metadata</summary>
          <pre className="mt-1 text-[10px] bg-gray-50 p-2 overflow-x-auto">
            {JSON.stringify(registro.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export default function RegistrosPage() {
  const { registros, loading, excluir, getArquivoUrl } = useRegistros();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Registros</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {loading ? "Carregando..." : `${registros.length} registro(s)`}
        </p>
      </div>

      {!loading && registros.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          Nenhum registro. Use o atalho do iPhone para enviar fotos e audio.
        </div>
      )}

      <div className="space-y-3">
        {registros.map((r) => (
          <RegistroCard
            key={r.id}
            registro={r}
            onDelete={excluir}
            onLoadImage={getArquivoUrl}
          />
        ))}
      </div>
    </div>
  );
}
