"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, MessageSquare, RefreshCw, TrendingUp, ArrowRight } from "lucide-react";

interface Conv { id: string; paciente_id: string; direccion: string; mensaje_encriptado: string; timestamp: string; }
interface Alerta { tipo: string; nombre: string; tel: string; descripcion: string; score: number; timestamp: string; }

function formatTel(t: string | null): string {
  if (!t) return "";
  const c = t.replace(/\D/g, "");
  if (c.length >= 10 && c.startsWith("57")) return `+57 ${c.slice(2, 5)} ${c.slice(5, 8)} ${c.slice(8)}`;
  return t;
}

const ALERTA_BADGE: Record<string, string> = {
  lead_listo: "badge badge-green", referido: "badge badge-black",
  caliente: "badge badge-red", sin_respuesta: "badge badge-yellow",
};
const ALERTA_LABEL: Record<string, string> = {
  lead_listo: "✓ Listo para llamar", referido: "Referido nuevo",
  caliente: "Lead caliente", sin_respuesta: "Sin respuesta",
};

export default function NotificacionesPage() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"alertas" | "actividad">("alertas");

  const load = useCallback(async () => {
    const [{ data: convData }, { data: pacData }] = await Promise.all([
      supabase.from("conversaciones").select("id,paciente_id,direccion,mensaje_encriptado,timestamp").order("timestamp", { ascending: false }).limit(40),
      supabase.from("pacientes").select("id,alias,telefono_encriptado,perfil_paciente,updated_at").eq("estado", "activo").order("updated_at", { ascending: false }).limit(60),
    ]);
    setConvs((convData || []) as Conv[]);
    const now = Date.now();
    const newAlertas: Alerta[] = [];
    ((pacData || []) as { id: string; alias: string; telefono_encriptado: string | null; perfil_paciente: Record<string, unknown>; updated_at: string }[]).forEach(p => {
      const perf = p.perfil_paciente || {};
      const score = parseInt(String(perf.score ?? "0")) || 0;
      const ec = (perf.estado_conv as string) || "nuevo";
      const tel = formatTel(p.telefono_encriptado);
      const nom = (perf.nombre as string) || tel || p.alias;
      const ua = perf.ultima_actividad_at ? new Date(perf.ultima_actividad_at as string) : new Date(p.updated_at);
      const hrs = (now - ua.getTime()) / 3600000;
      const ti = perf.tipo_intencion as string;
      if (ec === "entrega_premium") newAlertas.push({ tipo: "lead_listo", nombre: nom, tel, descripcion: "Lead con datos completos — listo para llamar", score, timestamp: ua.toISOString() });
      else if (ti === "referido") newAlertas.push({ tipo: "referido", nombre: nom, tel, descripcion: "Paciente referido registrado", score, timestamp: ua.toISOString() });
      else if (score >= 70) newAlertas.push({ tipo: "caliente", nombre: nom, tel, descripcion: `Score alto (${score}) — considerar contacto`, score, timestamp: ua.toISOString() });
      else if (hrs > 48 && score >= 20 && ec !== "entrega_premium") newAlertas.push({ tipo: "sin_respuesta", nombre: nom, tel, descripcion: `Sin respuesta hace ${Math.round(hrs)}h`, score, timestamp: ua.toISOString() });
    });
    setAlertas(newAlertas.sort((a, b) => b.score - a.score));
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Sistema de alertas</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)" }}>Actividad</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Actualización automática cada 30s</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Alertas activas", value: alertas.length, icon: Bell },
          { label: "Conversaciones recientes", value: convs.length, icon: MessageSquare },
          { label: "Leads urgentes", value: alertas.filter(a => a.tipo === "lead_listo" || a.tipo === "caliente").length, icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="dm-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#F4F4F6", border: "1px solid var(--border)" }}>
        {[{ key: "alertas", label: "Alertas IA" }, { key: "actividad", label: "Conversaciones" }].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className="px-5 py-2 text-sm font-medium rounded-lg transition-all"
            style={{ background: tab === key ? "var(--card)" : "transparent", color: tab === key ? "var(--text)" : "var(--text-muted)", boxShadow: tab === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" /></div>
      ) : tab === "alertas" ? (
        <div className="space-y-3">
          {alertas.length === 0 ? (
            <div className="dm-card p-14 text-center">
              <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="font-medium" style={{ color: "var(--text-secondary)" }}>Todo al día — sin alertas pendientes</p>
            </div>
          ) : alertas.map((a, i) => (
            <div key={i} className="dm-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                style={{ background: "#F4F4F6", color: "var(--text-secondary)" }}>
                {a.nombre.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>{a.nombre}</span>
                  <span className={ALERTA_BADGE[a.tipo] ?? "badge badge-gray"}>{ALERTA_LABEL[a.tipo] ?? a.tipo}</span>
                </div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{a.descripcion}</p>
                {a.tel && (
                  <p className="text-xs mt-1 font-medium" style={{ color: "var(--text-muted)" }}>{a.tel}</p>
                )}
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {formatDistanceToNow(new Date(a.timestamp), { locale: es, addSuffix: true })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold" style={{ color: a.score >= 60 ? "#111827" : "#D1D5DB" }}>{a.score}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>score</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dm-card overflow-hidden">
          {convs.length === 0 ? (
            <div className="p-14 text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="font-medium" style={{ color: "var(--text-secondary)" }}>Sin conversaciones recientes</p>
            </div>
          ) : convs.map((c, i) => (
            <div key={c.id} className={`px-5 py-3.5 flex items-start gap-3 ${i > 0 ? "border-t" : ""}`}
              style={{ borderColor: "var(--border)" }}>
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${c.direccion === "entrante" ? "bg-blue-500" : "bg-gray-300"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold" style={{ color: c.direccion === "entrante" ? "#1D4ED8" : "var(--text-muted)" }}>
                    {c.direccion === "entrante" ? "Paciente" : "Agente"}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    · {formatDistanceToNow(new Date(c.timestamp), { locale: es, addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm truncate" style={{ color: "var(--text)" }}>{c.mensaje_encriptado || "—"}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-1" style={{ color: "var(--text-muted)" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
