"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function DeleteGalpao({ id, titulo }: { id: string; titulo: string }) {
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    const supabase = createClient();
    await supabase.from("galpoes").delete().eq("id", id);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Confirmar?</span>
        <button onClick={handleDelete} className="text-xs text-red-600 hover:text-red-800 font-medium">
          Sim
        </button>
        <button onClick={() => setConfirming(false)} className="text-xs text-gray-500 hover:text-gray-700">
          Não
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-gray-400 hover:text-red-600 transition-colors"
    >
      Excluir
    </button>
  );
}
