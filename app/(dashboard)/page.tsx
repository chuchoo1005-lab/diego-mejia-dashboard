"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import StatCard from "@/components/StatCard";
import {
  MessageSquare, CalendarCheck, Users, TrendingUp, Clock,
  AlertCircle, Activity, Sparkles, ArrowRight, Zap
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Metricas {
  conversaciones_total: number;
  pacientes_nuevos: number;
  citas_agendadas: number;
  citas_completadas: number;
  conversion_rate: number;
}

interface Cita {
  id: string;
  fecha_hora: string;
  estado: string;
  paciente_id: string;
  pacientes: { alias: string };
  tratamientos: { nombre: string } | null;
}

interface Notificacion {
  id: string;
  tipo: string;
  contenido: string;
  leida: boolean;
  timestamp: string;
}

const estadoBadge: Record<string, { bg: string; text: string; dot: string }> = {
  confirmada: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  pendiente:  { bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-400" },
  completada: { bg: "bg-white/5",         text: "text-white/50",    dot: "bg-white/30" },
  cancelada:  { bg: "bg-rose-500/10",     text: "text-rose-400",    dot: "bg-rose-400" },
};

const tipoBadge: Record<string, { color: string; label: string }> = {
  nueva_cita:          { color: "text-emerald-400", label: "Cita" },
  paciente_calificado: { color: "text-sky-400",     label: "Paciente" },
  alerta_discrecion:   { color: "text-amber-400",   label: "VIP" },
  cancelacion:         { color: "text-rose-400",     label: "Cancelación" },
  seguimiento_urgente: { color: "text-orange-400",   label: "Urgente" },
  reporte_listo:       { color: "text-teal-400",     label: "Reporte" },
};

export default function Home() {
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const hoy = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    async function load() {
      const [{ data: met }, { data: citasData }, { data: notifsData }] = await Promise.all([
        supabase.from("metricas_diarias").select("*").eq("fecha", hoy).single(),
        supabase.from("citas")
          .select("id,fecha_hora,estado,paciente_id,pacientes(alias),tratamientos(nombre)")
          .gte("fecha_hora", new Date().toISOString())
          .order("fecha_hora", { ascending: true })
          .limit(5),
        supabase.from("notificaciones_equipo")
          .select("*")
          .eq("leida", false)
          .order("timestamp", { ascending: false })
          .limit(5),
      ]);
      setMetricas(met);
      setCitas((citasData as unknown as Cita[]) || []);
      setNotifs(notifsData || []);
      setLoading(false);
    }
    load();
    const channel = supabase.channel("realtime-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "notificaciones_equipo" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "citas" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hoy]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
          <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-b-cyan-400/50 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
        </div>
        <p className="text-sm text-white/30 font-medium">Cargando panel...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span className="text-[11px] font-semibold text-teal-400/70 uppercase tracking-[0.15em]">Panel de control</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Buenos{getGreetingTime()}, <span className="gradient-text">Dr. Mejía</span>
          </h1>
          <p className="text-white/40 text-sm mt-1.5 flex items-center gap-2">
            <CalendarCheck className="w-3.5 h-3.5" />
            {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-white/50 bg-white/[0.03] backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/5">
            <Activity className="w-3.5 h-3.5 text-teal-400" />
            <span>IA activa</span>
            <div className="w-2 h-2 bg-teal-400 rounded-full active-dot" />
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50 bg-white/[0.03] backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Tiempo real</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard
          title="Conversaciones hoy"
          value={metricas?.conversaciones_total ?? 0}
          icon={MessageSquare}
          color="teal"
          trend={{ value: 12, label: "vs ayer" }}
          delay={0}
        />
        <StatCard
          title="Pacientes nuevos"
          value={metricas?.pacientes_nuevos ?? 0}
          icon={Users}
          color="sky"
          trend={{ value: 8, label: "vs ayer" }}
          delay={50}
        />
        <StatCard
          title="Citas agendadas"
          value={metricas?.citas_agendadas ?? 0}
          icon={CalendarCheck}
          color="emerald"
          trend={{ value: 15, label: "vs ayer" }}
          delay={100}
        />
        <StatCard
          title="Tasa de conversión"
          value={`${metricas?.conversion_rate ?? 0}%`}
          icon={TrendingUp}
          color="amber"
          trend={{ value: 3, label: "vs ayer" }}
          delay={150}
        />
      </div>

      {/* Quick insights banner */}
      <div className="glass-card p-4 flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center shrink-0 border border-teal-500/10">
          <Sparkles className="w-5 h-5 text-teal-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-white/70">
            <span className="text-teal-400 font-semibold">Insight IA:</span>{" "}
            {metricas && metricas.conversion_rate > 50
              ? "Excelente tasa de conversión hoy. El sistema está captando pacientes eficientemente."
              : "El asistente de IA está procesando conversaciones. Los datos se actualizan en tiempo real."
            }
          </p>
        </div>
      </div>

      {/* Próximas citas + Notificaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Citas */}
        <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm">Próximas citas</h2>
                <p className="text-[11px] text-white/30">Agenda del día</p>
              </div>
            </div>
            <a href="/citas" className="flex items-center gap-1 text-xs text-teal-400/70 font-medium hover:text-teal-400 transition-colors group">
              Ver todas
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
          {citas.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3 border border-white/5">
                <CalendarCheck className="w-6 h-6 text-white/15" />
              </div>
              <p className="text-white/30 text-sm font-medium">No hay citas próximas</p>
              <p className="text-white/15 text-xs mt-1">Las citas aparecerán aquí en tiempo real</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {citas.map((c, i) => {
                const badge = estadoBadge[c.estado] ?? estadoBadge.pendiente;
                return (
                  <div key={c.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/8 transition-all group"
                    style={{ animationDelay: `${0.3 + i * 0.05}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center border border-white/5 shrink-0">
                        <span className="text-teal-400/70 font-bold text-xs">{c.pacientes?.alias?.slice(0, 2)?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">{c.pacientes?.alias ?? "—"}</p>
                        <p className="text-[11px] text-white/30 mt-0.5">
                          {c.tratamientos?.nombre ?? "Sin tratamiento"} · {format(new Date(c.fecha_hora), "HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium ${badge.bg} ${badge.text}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {c.estado}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                </div>
                {notifs.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-teal-500 to-cyan-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/30">
                    {notifs.length}
                  </span>
                )}
              </div>
              <div>
                <h2 className="font-bold text-white text-sm">Alertas activas</h2>
                <p className="text-[11px] text-white/30">Notificaciones sin leer</p>
              </div>
            </div>
            <a href="/notificaciones" className="flex items-center gap-1 text-xs text-teal-400/70 font-medium hover:text-teal-400 transition-colors group">
              Ver todas
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
          {notifs.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3 border border-white/5">
                <AlertCircle className="w-6 h-6 text-white/15" />
              </div>
              <p className="text-white/30 text-sm font-medium">Todo al día ✓</p>
              <p className="text-white/15 text-xs mt-1">Sin alertas pendientes</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {notifs.map((n, i) => {
                const badge = tipoBadge[n.tipo] ?? { color: "text-white/50", label: n.tipo };
                return (
                  <div key={n.id}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/8 transition-all"
                    style={{ animationDelay: `${0.35 + i * 0.05}s` }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${badge.color}`}>
                        {badge.label}
                      </span>
                      <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">{n.contenido}</p>
                    <p className="text-[11px] text-white/20 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(n.timestamp), "d MMM · HH:mm", { locale: es })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-center py-4">
        <p className="text-[10px] text-white/15 flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-teal-500/30" />
          Sistema actualizado en tiempo real · Diego Mejía Dental Group
          <span className="w-1 h-1 rounded-full bg-teal-500/30" />
        </p>
      </div>
    </div>
  );
}

function getGreetingTime() {
  const h = new Date().getHours();
  if (h < 12) return " días";
  if (h < 18) return "as tardes";
  return "as noches";
}
