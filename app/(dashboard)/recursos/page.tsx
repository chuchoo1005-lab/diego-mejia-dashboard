"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Play, Clock, RefreshCw, Video } from "lucide-react";

interface Recurso {
  id: string; tipo: string; categoria: string; nombre: string;
  descripcion: string; url_publica: string; activo: boolean;
  prioridad: string; duracion_seg: number;
}

const prioridadOrder: Record<string, number> = { muy_alta: 0, alta: 1, media: 2, baja: 3 };
const categoriaLabel: Record<string, string> = {
  bienvenida: "Bienvenida", diseno_sonrisa: "Diseño de sonrisa", ortodoncia_solucion: "Ortodoncia — Solución",
  instalaciones_premium: "Instalaciones", invisalign_oficial: "Invisalign Oficial",
  ortodoncia_comodidad: "Ortodoncia — Comodidad", costos_diseno: "Costos Diseño",
  ortodoncia_tecnologia: "Ortodoncia — Tecnología", invisalign_overlay: "Invisalign (descontinuado)",
};

function formatSeg(s: number) {
  const m = Math.floor(s / 60); const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function RecursosPage() {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Recurso | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("recursos_media")
      .select("id,tipo,categoria,nombre,descripcion,url_publica,activo,prioridad,duracion_seg")
      .order("prioridad");
    const sorted = ((data || []) as Recurso[]).sort((a, b) =>
      (prioridadOrder[a.prioridad] ?? 9) - (prioridadOrder[b.prioridad] ?? 9)
    );
    setRecursos(sorted);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activos = recursos.filter(r => r.activo);
  const inactivos = recursos.filter(r => !r.activo);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-3">Biblioteca de contenido</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.9rem", fontWeight: 300 }}>Recursos</h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Videos del agente conversacional · {activos.length} activos
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-sm"
          style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
          <RefreshCw className="w-3 h-3" /> Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border border-white/30 border-t-white rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Preview modal */}
          {preview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}
              onClick={() => setPreview(null)}>
              <div className="dm-card p-5 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white">{preview.nombre}</h3>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{preview.descripcion}</p>
                  </div>
                  <button onClick={() => setPreview(null)} className="text-xs px-3 py-1.5 rounded-sm"
                    style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
                    Cerrar
                  </button>
                </div>
                <video controls className="w-full rounded-sm" src={preview.url_publica} style={{ maxHeight: "400px", background: "#000" }}>
                  Tu navegador no soporta video.
                </video>
              </div>
            </div>
          )}

          {/* Videos activos */}
          <div>
            <p className="section-label mb-3">Videos activos en el agente</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activos.map(r => (
                <div key={r.id} className="dm-card p-4 flex flex-col gap-3">
                  {/* Thumbnail */}
                  <div className="relative rounded-sm overflow-hidden cursor-pointer group" style={{ background: "#111", aspectRatio: "16/9" }}
                    onClick={() => setPreview(r)}>
                    <video src={r.url_publica} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" muted preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}>
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  {/* Info */}
                  <div>
                    <p className="text-sm font-semibold text-white truncate">{categoriaLabel[r.categoria] ?? r.categoria}</p>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{r.descripcion}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                        <Clock className="w-3 h-3" />{formatSeg(r.duracion_seg)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm capitalize"
                        style={{ background: "rgba(255,255,255,0.07)", color: "var(--text-secondary)" }}>
                        {r.prioridad}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setPreview(r)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-sm transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                    <Play className="w-3 h-3" /> Reproducir
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Videos inactivos */}
          {inactivos.length > 0 && (
            <div>
              <p className="section-label mb-3">Archivados / descontinuados</p>
              <div className="dm-card divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {inactivos.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <Video className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{r.nombre}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{formatSeg(r.duracion_seg)} · {r.descripcion}</p>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-sm" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>
                      Inactivo
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
