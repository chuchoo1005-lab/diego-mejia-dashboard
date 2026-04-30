import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Diego Mejía Dental Group — Panel de Control",
  description: "Sistema inteligente de gestión y métricas en tiempo real para su clínica dental",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased bg-[#080c14] text-[#f1f5f9]">
        {children}
      </body>
    </html>
  );
}
