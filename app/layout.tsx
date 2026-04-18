import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Diego Mejía Dental Group — Panel de Control",
  description: "Sistema de gestión y métricas en tiempo real",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full dark`}>
      <body className="min-h-full bg-[#0f1117] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
