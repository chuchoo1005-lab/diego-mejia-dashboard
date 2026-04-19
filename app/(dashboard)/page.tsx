"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import StatCard from "@/components/StatCard";
import { MessageSquare, CalendarCheck, Users, TrendingUp, Clock, AlertCircle } from "lucide-react";
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

const estadoBadge: Record<string, string> = {
  confirmada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pendiente:  "bg-amber-50 text-amber-700 border-amber-200",
  completada: "bg-slate-100 text-slate-600 border-slate-200",
  cancelada:  "bg-rose-50 text-rose-700 border-rose-200",
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
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#1a2740] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2740]">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Resumen general de la clínica · {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Sistema activo
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Conversaciones hoy" value={metricas?.conversaciones_total ?? 0} icon={MessageSquare} color="navy" />
        <StatCard title="Pacientes nuevos"    value={metricas?.pacientes_nuevos ?? 0}    icon={Users}        color="sky" />
        <StatCard title="Citas agendadas"     value={metricas?.citas_agendadas ?? 0}     icon={CalendarCheck} color="emerald" />
        <StatCard title="Tasa de conversión"  value={`${metricas?.conversion_rate ?? 0}%`} icon={TrendingUp} color="amber" />
      </div>

      {/* Próximas citas + Notificaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Citas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#1a2740] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1a2740]" /> Próximas citas
            </h2>
            <a href="/citas" className="text-xs text-[#1a2740] font-medium hover:underline">Ver todas →</a>
          </div>
          {citas.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No hay citas próximas</p>
          ) : (
            <div className="space-y-3">
              {citas.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-semibold text-[#1a2740]">{c.pacientes?.alias ?? "—"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{c.tratamientos?.nombre ?? "Sin tratamiento"}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {format(new Date(c.fecha_hora), "EEE d MMM · HH:mm", { locale: es })}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${estadoBadge[c.estado] ?? estadoBadge.pendiente}`}>
                    {c.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#1a2740] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Alertas sin leer
              {notifs.length > 0 && (
                <span className="ml-1 bg-[#1a2740] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {notifs.length}
                </span>
              )}
            </h2>
            <a href="/notificaciones" className="text-xs text-[#1a2740] font-medium hover:underline">Ver todas →</a>
          </div>
          {notifs.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Todo al día ✓</p>
          ) : (
            <div className="space-y-3">
              {notifs.map((n) => (
                <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-sm text-slate-700">{n.contenido}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(n.timestamp), "d MMM · HH:mm", { locale: es })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
