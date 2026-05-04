import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Diego Mejía Dental Group — Panel de Control",
  description: "Sistema inteligente de gestión y métricas para su clínica dental",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${cormorant.variable} ${dmSans.variable} h-full`}>
      <body className="min-h-full antialiased" style={{ background: "#0A0A0A", color: "#FFFFFF", fontFamily: "var(--font-dm), sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
