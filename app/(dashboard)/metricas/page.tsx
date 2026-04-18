"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart3, TrendingUp, CalendarCheck, Users } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";

interface Metrica {
  fecha: string;
  conversaciones_total: number;
  pacientes_nuevos: number;
  citas_agendadas: number;
  citas_completadas: number;
  conversion_rate: number;
  ingresos_estimados_cop: number;
}

interface Tratamiento {
  nombre: string;
  precio_cop: number;
}

const formatCOP = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, notation: "compact" }).format(v);

const TooltipCustom = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1f2e] border border-[#1e2535] rounded-xl p-3 shadow-xl text-xs">
      <p className="text-slate-400 font-medium mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function MetricasPage() {
  const [datos, setDatos] = useState<Metrica[]>([]);
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const desde = format(subDays(new Date(), 13), "yyyy-MM-dd");
      const [{ data: met }, { data: trat }] = await Promise.all([
        supabase.from("metricas_diarias").select("*").gte("fecha", desde).order("fecha"),
        supabase.from("tratamientos").select("nombre,precio_cop").eq("activo", true).order("precio_cop", { ascending: false }).limit(8),
      ]);
      setDatos(met || []);
      setTratamientos(trat || []);
      setLoading(false);
    }
    load();
  }, []);

  const chartData = datos.map(d => ({
    fecha: format(new Date(d.fecha + "T12:00:00"), "d MMM", { locale: es }),
    Conversaciones: d.conversaciones_total,
    "Citas agendadas": d.citas_agendadas,
    "Pacientes nuevos": d.pacientes_nuevos,
  }));

  const ingresoData = datos.map(d => ({
    fecha: format(new Date(d.fecha + "T12:00:00"), "d MMM", { locale: es }),
    Ingresos: d.ingresos_estimados_cop,
  }));

  const totalIngresos = datos.reduce((s, d) => s + (d.ingresos_estimados_cop || 0), 0);
  const totalCitas = datos.reduce((s, d) => s + (d.citas_agendadas || 0), 0);
  const totalPacientes = datos.reduce((s, d) => s + (d.pacientes_nuevos || 0), 0);
  const convRate = datos.length > 0 ? (datos.reduce((s, d) => s + (d.conversion_rate || 0), 0) / datos.length).toFixed(1) : "0";

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-400" /> Métricas
        </h1>
        <p className="text-slate-500 text-sm mt-1">Últimos 14 días</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Ingresos estimados", value: formatCOP(totalIngresos), icon: TrendingUp, color: "text-emerald-400" },
          { label: "Citas agendadas", value: totalCitas, icon: CalendarCheck, color: "text-indigo-400" },
          { label: "Pacientes nuevos", value: totalPacientes, icon: Users, color: "text-sky-400" },
          { label: "Conversión promedio", value: `${convRate}%`, icon: BarChart3, color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#1a1f2e] border border-[#1e2535] rounded-2xl p-5">
            <Icon className={`w-5 h-5 ${color} mb-3`} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Gráfica conversaciones vs citas */}
      <div className="bg-[#1a1f2e] border border-[#1e2535] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-5">Conversaciones · Citas · Pacientes nuevos</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gCitas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
            <XAxis dataKey="fecha" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<TooltipCustom />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", color: "#64748b" }} />
            <Area type="monotone" dataKey="Conversaciones" stroke="#6366f1" strokeWidth={2} fill="url(#gConv)" />
            <Area type="monotone" dataKey="Citas agendadas" stroke="#10b981" strokeWidth={2} fill="url(#gCitas)" />
            <Area type="monotone" dataKey="Pacientes nuevos" stroke="#38bdf8" strokeWidth={2} fill="none" strokeDasharray="4 2" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Ingresos */}
      <div className="bg-[#1a1f2e] border border-[#1e2535] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-5">Ingresos estimados (COP)</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={ingresoData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
            <XAxis dataKey="fecha" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCOP(v)} />
            <Tooltip content={<TooltipCustom />} />
            <Bar dataKey="Ingresos" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tratamientos */}
      <div className="bg-[#1a1f2e] border border-[#1e2535] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Catálogo de tratamientos</h2>
        <div className="space-y-3">
          {tratamientos.map((t, i) => {
            const max = tratamientos[0]?.precio_cop ?? 1;
            const pct = Math.round((t.precio_cop / max) * 100);
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 truncate">{t.nombre}</span>
                    <span className="text-slate-500 ml-2 shrink-0">{formatCOP(t.precio_cop)}</span>
                  </div>
                  <div className="h-1.5 bg-[#0f1117] rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
