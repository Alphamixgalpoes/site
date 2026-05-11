import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { nome, telefone, empresa, galpao_id, galpao_titulo } = await req.json();

  if (!nome?.trim() || !telefone?.trim()) {
    return NextResponse.json({ error: "Nome e telefone obrigatórios" }, { status: 400 });
  }

  const { error: dbError } = await supabase.from("leads").insert({
    nome: nome.trim(),
    telefone: telefone.trim(),
    empresa: empresa?.trim() || null,
    galpao_id: galpao_id || null,
    galpao_titulo: galpao_titulo || null,
  });

  if (dbError) {
    console.error("Supabase insert error:", dbError);
    return NextResponse.json({ error: "Erro ao salvar lead" }, { status: 500 });
  }

  if (process.env.RESEND_API_KEY && process.env.RESEND_TO_EMAIL) {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Petrus Imóveis <onboarding@resend.dev>",
      to: process.env.RESEND_TO_EMAIL!.split(",").map((e) => e.trim()),
      subject: `Novo lead: ${nome.trim()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; color: #111;">
          <p style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Novo lead pelo site</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 120px;">Nome</td>
              <td style="padding: 8px 0; font-weight: 500;">${nome.trim()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Telefone</td>
              <td style="padding: 8px 0; font-weight: 500;">
                <a href="https://wa.me/55${telefone.replace(/\D/g, "")}" style="color: #111;">${telefone.trim()}</a>
              </td>
            </tr>
            ${empresa?.trim() ? `
            <tr>
              <td style="padding: 8px 0; color: #666;">Empresa</td>
              <td style="padding: 8px 0; font-weight: 500;">${empresa.trim()}</td>
            </tr>` : ""}
            ${galpao_titulo ? `
            <tr>
              <td style="padding: 8px 0; color: #666;">Imóvel</td>
              <td style="padding: 8px 0; font-weight: 500;">${galpao_titulo}</td>
            </tr>` : ""}
          </table>
          <div style="margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px;">
            <a href="https://wa.me/55${telefone.replace(/\D/g, "")}"
               style="display: inline-block; background: #111; color: #fff; padding: 10px 20px; text-decoration: none; font-size: 14px;">
              Abrir WhatsApp
            </a>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #999;">Petrus Imóveis · petrusweb.vercel.app</p>
        </div>
      `,
    });
  }

  return NextResponse.json({ ok: true });
}
