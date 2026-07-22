import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase-server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alphamixgalpoes.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const { data: pubRows } = await supabase
    .from("imovel_publicacao")
    .select("imovel_id, updated_at, imoveis(updated_at)")
    .eq("ativo", true)
    .order("published_at", { ascending: false });

  const imoveisEntries: MetadataRoute.Sitemap = (pubRows ?? []).map((r: any) => ({
    url: `${siteUrl}/imoveis/${r.imovel_id}`,
    lastModified: r.imoveis?.updated_at ? new Date(r.imoveis.updated_at) : new Date(r.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...imoveisEntries,
  ];
}
