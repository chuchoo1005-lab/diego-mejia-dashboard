"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, MessageSquare, RefreshCw, TrendingUp, Users } from "lucide-react";

interface ConvReciente {
  id: string; paciente_id: string; direccion: string; mensaje_encriptado: string;
  timestamp: string; metadata: Record<string, unknown>;
}

interface AlertaLead {
  tipo: string; alias: string; descripcion: string; score: number; timestamp: string;
}

export default function NotificacionesPage() {
  const [convs, setConvs] = useState<ConvReciente[]>([]);
  const [alertas, setAlertas] = useState<AlertaLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"alertas" | "actividad">("alertas");

  const load = useCallback(async () => {
    const [{ data: convData }, { data: pacData }] = await Promise.all([
      supabase.from("conversaciones").select("id,paciente_id,direccion,mensaje_encriptado,timestamp,metadata").order("timestamp", { ascending: false }).limit(30),
      supabase.from("pacientes").select("id,alias,perfil_paciente,updated_at").eq("estado", "activo").order("updated_at", { ascending: false }).limit(50),
    ]);

    setConvs((convData || []) as ConvReciente[]);

    const now = Date.now();
    const newAlertas: AlertaLead[] = [];

    ((pacData || []) as { id: string; alias: string; perfil_paciente: Record<string, unknown>; updated_at: string }[]).forEach(p => {
      const perfil = p.perfil_paciente || {};
      const score = parseInt(String(perfil.score ?? "0")) || 0;
      const estadoConv = (perfil.estado_conv as string) || "nuevo";
      const ua = perfil.ultima_actividad_at ? new Date(perfil.ultima_actividad_at as string) : new Date(p.updated_at);
      const horasSin = (now - ua.getTime()) / 3600000;
      const tipoIntencion = perfil.tipo_intencion as string;

      if (estadoConv === "entrega_premium" && !(perfil.notificado_asesora as boolean)) {
        newAlertas.push({ tipo: "lead_listo", alias: p.alias, descripcion: "Lead listo para llamada — datos completos", score, timestamp: ua.toISOString() });
      } else if (tipoIntencion === "referido") {
        newAlertas.push({ tipo: "referido", alias: p.alias, descripcion: "Nuevo referido registrado", score, timestamp: ua.toISOString() });
      } else if (score >= 70) {
        newAlertas.push({ tipo: "caliente", alias: p.alias, descripcion: `Score alto (${score}) — considerar contacto`, score, timestamp: ua.toISOString() });
      } else if (horasSin > 48 && score >= 20 && estadoConv !== "entrega_premium") {
        newAlertas.push({ tipo: "sin_respuesta", alias: p.alias, descripcion: `Sin respuesta hace ${Math.round(horasSin)}h`, score, timestamp: ua.toISOString() });
      }
    });

    setAlertas(newAlertas.sort((a, b) => b.score - a.score));
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const tipoConfig: Record<string, { label: string; accent: string }> = {
    lead_listo:    { label: "Listo para llamada", accent: "#FFF" },
    referido:      { label: "Referido nuevo",     accent: "#FFF" },
    caliente:      { label: "Lead caliente",      accent: "rgba(255,255,255,0.7)" },
    sin_respuesta: { label: "Sin respuesta",      accent: "rgba(255,255,255,0.4)" },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-3">Sistema de alertas</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.9rem", fontWeight: 300 }}>
            Actividad del sistema
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Alertas en tiempo real · Actualización cada 30s</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-sm" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
          <RefreshCw className="w-3 h-3" /> Actualizar
        </button>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Alertas activas", value: alertas.length, icon: Bell },
          { label: "Conversaciones recientes", value: convs.length, icon: MessageSquare },
          { label: "Leads calientes", value: alertas.filter(a => a.tipo === "caliente" || a.tipo === "lead_listo").length, icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="dm-card p-4">
            <div className="w-6 h-6 rounded-sm flex items-center justify-center mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
              <Icon className="w-3 h-3" style={{ color: "var(--text-secondary)" }} />
            </div>
            <p className="text-2xl font-semibold text-white">{value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-sm w-fit" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
        {[
          { key: "alertas", label: "Alertas IA" },
          { key: "actividad", label: "Actividad reciente" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)} className="px-4 py-2 text-xs font-medium rounded-sm transition-all"
            style={{ background: tab === key ? "rgba(255,255,255,0.08)" : "transparent", color: tab === key ? "#FFF" : "var(--text-secondary)" }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border border-white/20 border-t-white rounded-full animate-spin" /></div>
      ) : tab === "alertas" ? (
        <div className="space-y-2">
          {alertas.length === 0 ? (
            <div className="dm-card p-12 text-center">
              <Bell className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Todo al día — sin alertas pendientes</p>
            </div>
          ) : alertas.map((a, i) => {
            const c = tipoConfig[a.tipo] ?? { label: a.tipo, accent: "rgba(255,255,255,0.4)" };
            return (
              <div key={i} className="dm-card p-4 flex items-center gap-4" style={{ borderLeft: `2px solid ${c.accent}` }}>
                <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
                  {a.alias.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-white text-sm">{a.alias}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>{c.label}</span>
                  </div>
                  <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{a.descripcion}</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{formatDistanceToNow(new Date(a.timestamp), { locale: es, addSuffix: true })}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${a.score >= 60 ? "text-white" : "text-white/40"}`}>{a.score}</p>
                  <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>score</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="dm-card divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {convs.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin actividad reciente</p>
            </div>
          ) : convs.map(c => (
            <div key={c.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-white/[0.01] transition-colors">
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: c.direccion === "entrante" ? "#FFF" : "rgba(255,255,255,0.3)" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{c.direccion === "entrante" ? "Paciente" : "Agente"}</span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>·</span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{formatDistanceToNow(new Date(c.timestamp), { locale: es, addSuffix: true })}</span>
                </div>
                <p className="text-sm text-white/70 truncate">{c.mensaje_encriptado || "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
