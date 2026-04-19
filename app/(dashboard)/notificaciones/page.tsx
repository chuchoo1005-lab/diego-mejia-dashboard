"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, CheckCheck } from "lucide-react";

interface Notificacion {
  id: string;
  tipo: string;
  contenido: string;
  leida: boolean;
  timestamp: string;
}

const tipoBadge: Record<string, { style: string; label: string }> = {
  nueva_cita:           { style: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Nueva cita" },
  paciente_calificado:  { style: "bg-sky-50 text-sky-700 border-sky-200",             label: "Paciente calificado" },
  alerta_discrecion:    { style: "bg-amber-50 text-amber-700 border-amber-200",       label: "⚠️ Discreción VIP" },
  cancelacion:          { style: "bg-rose-50 text-rose-700 border-rose-200",          label: "Cancelación" },
  seguimiento_urgente:  { style: "bg-orange-50 text-orange-700 border-orange-200",    label: "Seguimiento urgente" },
  reporte_listo:        { style: "bg-[#1a2740]/10 text-[#1a2740] border-[#1a2740]/20", label: "Reporte listo" },
};

export default function NotificacionesPage() {
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2740] flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#1a2740]" /> Notificaciones
            {sinLeer > 0 && (
              <span className="bg-[#1a2740] text-white text-xs font-bold px-2 py-0.5 rounded-full">{sinLeer}</span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{sinLeer} sin leer de {notifs.length} totales</p>
        </div>
        {sinLeer > 0 && (
          <button onClick={marcarTodas}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-[#1a2740]/40 hover:text-[#1a2740] transition-all shadow-sm">
            <CheckCheck className="w-4 h-4" /> Marcar todas como leídas
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#1a2740] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No hay notificaciones</div>
      ) : (
        <div className="space-y-3">
          {notifs.map(n => {
            const badge = tipoBadge[n.tipo] ?? { style: "bg-slate-100 text-slate-600 border-slate-200", label: n.tipo };
            return (
              <div key={n.id}
                className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-sm transition-all
                  ${n.leida ? "border-slate-200 opacity-60" : "border-[#1a2740]/20"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${badge.style}`}>{badge.label}</span>
                      {!n.leida && <span className="w-2 h-2 bg-[#1a2740] rounded-full animate-pulse" />}
                    </div>
                    <p className="text-sm text-slate-700">{n.contenido}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {format(new Date(n.timestamp), "EEEE d 'de' MMMM · HH:mm", { locale: es })}
                    </p>
                  </div>
                  {!n.leida && (
                    <button onClick={() => marcarLeida(n.id)}
                      className="shrink-0 text-xs text-slate-400 hover:text-[#1a2740] font-medium transition-colors px-2 py-1 rounded-lg hover:bg-slate-100">
                      Leída
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
