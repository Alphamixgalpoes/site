import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase-server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alphamixgalpoes.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const { data: galpoes } = await supabase
    .from("galpoes")
    .select("id, updated_at")
    .eq("publicado", true)
    .order("updated_at", { ascending: false });

  const galpoesEntries: MetadataRoute.Sitemap = (galpoes ?? []).map((g) => ({
    url: `${siteUrl}/galpoes/${g.id}`,
    lastModified: g.updated_at ? new Date(g.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...galpoesEntries,
  ];
}
