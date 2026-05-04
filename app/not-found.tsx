import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
      <div className="text-center">
        <p className="text-6xl font-bold text-white/10 mb-4" style={{ fontFamily: "var(--font-cormorant)" }}>404</p>
        <h1 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "var(--font-cormorant)" }}>Página no encontrada</h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Esta sección no existe o fue movida.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-sm"
          style={{ background: "rgba(255,255,255,0.06)", color: "#FFF", border: "1px solid rgba(255,255,255,0.1)" }}>
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
