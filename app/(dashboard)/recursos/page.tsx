"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Play, Clock, RefreshCw, Video, Image, X } from "lucide-react";

interface Recurso {
  id: string; tipo: string; categoria: string; nombre: string;
  descripcion: string; url_publica: string; activo: boolean;
  prioridad: string; duracion_seg: number;
}

const prioridadOrder: Record<string, number> = { muy_alta: 0, alta: 1, media: 2, baja: 3 };

function formatSeg(s: number) {
  if (!s) return "";
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
      .order("tipo").order("prioridad");
    const sorted = ((data || []) as Recurso[]).sort((a, b) =>
      (prioridadOrder[a.prioridad] ?? 9) - (prioridadOrder[b.prioridad] ?? 9)
    );
    setRecursos(sorted);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const videos = recursos.filter(r => r.activo && r.tipo === "video");
  const fotos  = recursos.filter(r => r.activo && r.tipo === "imagen");
  const inactivos = recursos.filter(r => !r.activo);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Biblioteca de contenido</p>
          <h1 style={{ fontFamily:"var(--font-cormorant)", fontSize:"2rem", fontWeight:500, color:"var(--text)" }}>Recursos</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-3)" }}>
            {videos.length} videos · {fotos.length} fotos de instalaciones
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
          style={{ background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", color:"var(--text-2)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor:"rgba(6,182,212,0.2)", borderTopColor:"var(--cyan)" }} />
        </div>
      ) : (
        <>
          {/* Preview modal */}
          {preview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.9)" }}
              onClick={() => setPreview(null)}>
              <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-white">{preview.nombre}</p>
                  <button onClick={() => setPreview(null)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                {preview.tipo === "video" ? (
                  <video controls className="w-full rounded-xl" src={preview.url_publica} style={{ maxHeight:"420px", background:"#000" }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.url_publica} alt={preview.nombre} className="w-full rounded-xl object-contain" style={{ maxHeight:"80vh" }} />
                )}
                <p className="text-xs mt-2" style={{ color:"rgba(255,255,255,0.4)" }}>{preview.descripcion}</p>
              </div>
            </div>
          )}

          {/* FOTOS DE INSTALACIONES */}
          {fotos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Image className="w-4 h-4" style={{ color:"var(--cyan)" }} />
                <p className="section-label">Fotos de instalaciones · El agente las envía cuando preguntan por la clínica</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {fotos.map((f, i) => (
                  <div key={f.id} className="dm-card overflow-hidden cursor-pointer group" onClick={() => setPreview(f)}>
                    <div className="relative" style={{ aspectRatio:"4/3", background:"#111" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url_publica} alt={f.nombre}
                        className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                        style={{ display:"block" }} />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background:"rgba(255,255,255,0.2)", backdropFilter:"blur(4px)" }}>
                          <Image className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="absolute top-2 left-2 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black"
                        style={{ background:"rgba(6,182,212,0.9)", color:"#000" }}>{i + 1}</div>
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-medium truncate" style={{ color:"var(--text)" }}>{f.nombre}</p>
                      <p className="text-[10px] mt-0.5 truncate" style={{ color:"var(--text-3)" }}>{f.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIDEOS ACTIVOS */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Video className="w-4 h-4" style={{ color:"var(--cyan)" }} />
              <p className="section-label">Videos activos en el agente conversacional</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map(r => (
                <div key={r.id} className="dm-card overflow-hidden">
                  <div className="relative cursor-pointer group" style={{ aspectRatio:"16/9", background:"#0A0A0A" }}
                    onClick={() => setPreview(r)}>
                    <video src={r.url_publica} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" muted preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background:"rgba(255,255,255,0.15)", backdropFilter:"blur(4px)" }}>
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-semibold" style={{ color:"var(--text)" }}>{r.nombre}</p>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color:"var(--text-2)" }}>{r.descripcion}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {r.duracion_seg > 0 && (
                        <span className="flex items-center gap-1 text-[10px]" style={{ color:"var(--text-3)" }}>
                          <Clock className="w-3 h-3" />{formatSeg(r.duracion_seg)}
                        </span>
                      )}
                      <span className="badge badge-cyan text-[10px]">{r.prioridad}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* INACTIVOS */}
          {inactivos.length > 0 && (
            <div>
              <p className="section-label mb-3">Archivados</p>
              <div className="dm-card divide-y" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
                {inactivos.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <Video className="w-4 h-4 shrink-0" style={{ color:"var(--text-3)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color:"var(--text-2)" }}>{r.nombre}</p>
                    </div>
                    <span className="badge badge-gray">Inactivo</span>
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
