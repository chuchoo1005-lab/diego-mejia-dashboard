"use client";
import { useEffect } from "react";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error("Dashboard error:", error); }, [error]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-2xl mb-3" style={{ color: "rgba(255,255,255,0.15)", fontFamily: "var(--font-cormorant)" }}>Error al cargar</p>
        <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
          {error.message || "No se pudo cargar esta sección."}
        </p>
        <button onClick={reset} className="px-4 py-2 text-sm rounded-sm"
          style={{ background: "rgba(255,255,255,0.07)", color: "#FFF", border: "1px solid rgba(255,255,255,0.12)" }}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
