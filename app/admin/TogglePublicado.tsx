"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function TogglePublicado({ id, publicado }: { id: string; publicado: boolean }) {
  const [value, setValue] = useState(publicado);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("galpoes").update({ publicado: !value }).eq("id", id);
    setValue(!value);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-3 py-1 font-medium transition-colors ${
        value
          ? "bg-green-100 text-green-800 hover:bg-green-200"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      {value ? "Publicado" : "Oculto"}
    </button>
  );
}
