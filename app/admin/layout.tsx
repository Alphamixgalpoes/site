import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import AdminShell from "./_components/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <AdminShell>{children}</AdminShell>;
}
