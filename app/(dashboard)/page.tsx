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
  confirmada: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  pendiente: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  completada: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  cancelada: "bg-rose-500/15 text-rose-400 border-rose-500/20",
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
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Buen día, Diego 👋</h1>
          <p className="text-slate-500 text-sm mt-1">{format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-[#1a1f2e] px-3 py-2 rounded-lg border border-[#1e2535]">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          Sistema activo
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Conversaciones hoy" value={metricas?.conversaciones_total ?? 0} icon={MessageSquare} color="indigo" />
        <StatCard title="Pacientes nuevos" value={metricas?.pacientes_nuevos ?? 0} icon={Users} color="sky" />
        <StatCard title="Citas agendadas" value={metricas?.citas_agendadas ?? 0} icon={CalendarCheck} color="emerald" />
        <StatCard title="Tasa de conversión" value={`${metricas?.conversion_rate ?? 0}%`} icon={TrendingUp} color="amber" />
      </div>

      {/* Próximas citas + Notificaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Citas */}
        <div className="bg-[#1a1f2e] border border-[#1e2535] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" /> Próximas citas
            </h2>
            <a href="/citas" className="text-xs text-indigo-400 hover:text-indigo-300">Ver todas →</a>
          </div>
          {citas.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No hay citas próximas</p>
          ) : (
            <div className="space-y-3">
              {citas.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-[#0f1117] rounded-xl border border-[#1e2535]">
                  <div>
                    <p className="text-sm font-semibold text-white">{c.pacientes?.alias ?? "—"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{c.tratamientos?.nombre ?? "Sin tratamiento"}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
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
        <div className="bg-[#1a1f2e] border border-[#1e2535] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" /> Alertas sin leer
              {notifs.length > 0 && (
                <span className="ml-1 bg-indigo-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {notifs.length}
                </span>
              )}
            </h2>
            <a href="/notificaciones" className="text-xs text-indigo-400 hover:text-indigo-300">Ver todas →</a>
          </div>
          {notifs.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Todo al día ✓</p>
          ) : (
            <div className="space-y-3">
              {notifs.map((n) => (
                <div key={n.id} className="p-3 bg-[#0f1117] rounded-xl border border-[#1e2535]">
                  <p className="text-sm text-slate-200">{n.contenido}</p>
                  <p className="text-xs text-slate-600 mt-1">
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
