"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, CheckCheck, Clock, AlertTriangle, CalendarCheck, UserCheck, FileText, XCircle, Zap } from "lucide-react";

interface Notificacion {
  id: string;
  tipo: string;
  contenido: string;
  leida: boolean;
  timestamp: string;
}

const tipoBadge: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  nueva_cita:           { icon: CalendarCheck,  color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Nueva cita" },
  paciente_calificado:  { icon: UserCheck,      color: "text-sky-400",     bg: "bg-sky-500/10",     label: "Paciente calificado" },
  alerta_discrecion:    { icon: AlertTriangle,  color: "text-amber-400",   bg: "bg-amber-500/10",   label: "⚠️ Discreción VIP" },
  cancelacion:          { icon: XCircle,        color: "text-rose-400",    bg: "bg-rose-500/10",    label: "Cancelación" },
  seguimiento_urgente:  { icon: Zap,            color: "text-orange-400",  bg: "bg-orange-500/10",  label: "Seguimiento urgente" },
  reporte_listo:        { icon: FileText,       color: "text-teal-400",    bg: "bg-teal-500/10",    label: "Reporte listo" },
};

export default function NotificacionesPage() {
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todas" | "sin_leer" | "leidas">("todas");

  const load = async () => {
    const { data } = await supabase
      .from("notificaciones_equipo")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(50);
    setNotifs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("notifs-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "notificaciones_equipo" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const marcarLeida = async (id: string) => {
    await supabase.from("notificaciones_equipo").update({ leida: true, leida_at: new Date().toISOString() }).eq("id", id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const marcarTodas = async () => {
    for (const n of notifs.filter(n => !n.leida)) await marcarLeida(n.id);
  };

  const sinLeer = notifs.filter(n => !n.leida).length;

  const notifsFiltradas = notifs.filter(n => {
    if (filtro === "sin_leer") return !n.leida;
    if (filtro === "leidas") return n.leida;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-teal-400" />
            <span className="text-[11px] font-semibold text-teal-400/70 uppercase tracking-[0.15em]">Centro de alertas</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Notificaciones
            {sinLeer > 0 && (
              <span className="bg-gradient-to-br from-teal-500 to-cyan-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-teal-500/25">
                {sinLeer} nuevas
              </span>
            )}
          </h1>
          <p className="text-white/40 text-sm mt-1">{sinLeer} sin leer de {notifs.length} totales</p>
        </div>
        <div className="flex items-center gap-3">
          {sinLeer > 0 && (
            <button onClick={marcarTodas}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/15 transition-all">
              <CheckCheck className="w-4 h-4" /> Marcar todas leídas
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: "todas", label: "Todas", count: notifs.length },
          { key: "sin_leer", label: "Sin leer", count: sinLeer },
          { key: "leidas", label: "Leídas", count: notifs.length - sinLeer },
        ].map(({ key, label, count }) => (
          <button key={key} onClick={() => setFiltro(key as typeof filtro)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all
              ${filtro === key
                ? "bg-teal-500/15 text-teal-400 border-teal-500/20"
                : "bg-white/[0.02] text-white/40 border-white/5 hover:border-white/10 hover:text-white/60"}`}>
            {label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              filtro === key ? "bg-teal-500/20 text-teal-400" : "bg-white/5 text-white/25"
            }`}>{count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
        </div>
      ) : notifsFiltradas.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4 border border-white/5">
            <Bell className="w-7 h-7 text-white/15" />
          </div>
          <p className="text-white/30 font-medium">
            {filtro === "sin_leer" ? "Sin alertas pendientes ✓" : "No hay notificaciones"}
          </p>
          <p className="text-white/15 text-sm mt-1">Las alertas aparecerán aquí en tiempo real</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {notifsFiltradas.map(n => {
            const badge = tipoBadge[n.tipo] ?? { icon: Bell, color: "text-white/50", bg: "bg-white/5", label: n.tipo };
            const IconComponent = badge.icon;
            return (
              <div key={n.id}
                className={`glass-card p-5 transition-all group ${
                  n.leida ? "opacity-50" : "border-l-2 border-l-teal-500/30"
                }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-xl ${badge.bg} flex items-center justify-center shrink-0 border border-white/5`}>
                      <IconComponent className={`w-4.5 h-4.5 ${badge.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${badge.color}`}>
                          {badge.label}
                        </span>
                        {!n.leida && <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />}
                      </div>
                      <p className="text-sm text-white/60 leading-relaxed">{n.contenido}</p>
                      <p className="text-[11px] text-white/20 mt-2.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {format(new Date(n.timestamp), "EEEE d 'de' MMMM · HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                  {!n.leida && (
                    <button onClick={() => marcarLeida(n.id)}
                      className="shrink-0 text-xs text-white/20 hover:text-teal-400 font-semibold transition-all px-3 py-1.5 rounded-lg hover:bg-teal-500/10 border border-transparent hover:border-teal-500/20">
                      ✓ Leída
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
