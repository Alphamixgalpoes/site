import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CORRETOR } from "@/lib/corretor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alphamixgalpoes.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Alphamix Galpões — Galpões Industriais em Alphaville e Barueri",
    template: "%s | Alphamix Galpões",
  },
  description:
    "Especialistas em venda e locação de galpões industriais na região de Alphaville, Barueri e Tamboré. Atendimento direto com corretor especializado. CRECI-SP.",
  keywords: [
    "galpão industrial",
    "galpão para alugar",
    "galpão para venda",
    "galpão Alphaville",
    "galpão Barueri",
    "galpão Tamboré",
    "imóvel industrial",
    "galpão logístico",
    "locação galpão SP",
    "venda galpão SP",
  ],
  authors: [{ name: "Alphamix Galpões" }],
  creator: "Alphamix Galpões",
  publisher: "Alphamix Galpões",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Alphamix Galpões",
    title: "Alphamix Galpões — Galpões Industriais em Alphaville e Barueri",
    description:
      "Especialistas em venda e locação de galpões industriais na região de Alphaville, Barueri e Tamboré. Atendimento direto com corretor especializado.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Alphamix Galpões — Galpões Industriais",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alphamix Galpões — Galpões Industriais em Alphaville e Barueri",
    description:
      "Especialistas em venda e locação de galpões industriais na região de Alphaville, Barueri e Tamboré.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: "Alphamix Galpões",
    description:
      "Especialistas em venda e locação de galpões industriais na região de Alphaville, Barueri e Tamboré.",
    url: siteUrl,
    telephone: `+55${CORRETOR.whatsapp}`,
    email: CORRETOR.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Barueri",
      addressRegion: "SP",
      addressCountry: "BR",
    },
    areaServed: [
      "Alphaville",
      "Barueri",
      "Tamboré",
      "Carapicuíba",
      "Jandira",
      "Cotia",
    ],
    knowsAbout: [
      "Galpões industriais",
      "Imóveis logísticos",
      "Locação comercial",
      "Venda de galpões",
    ],
  };

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
