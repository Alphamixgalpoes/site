import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import Sidebar from "./Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 px-8 py-8 overflow-auto">{children}</main>
    </div>
  );
}
