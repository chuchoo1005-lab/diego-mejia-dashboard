"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart3, TrendingUp, CalendarCheck, Users, DollarSign, Activity, Sparkles } from "lucide-react";
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
    <div className="bg-[#1a2332]/95 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl text-xs">
      <p className="text-white/50 font-semibold mb-2.5 text-[11px] uppercase tracking-wider">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-white/40">{p.name}:</span>
            <span className="font-bold text-white/90">{typeof p.value === "number" && p.name.includes("Ingreso") ? formatCOP(p.value) : p.value}</span>
          </div>
        ))}
      </div>
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
    <div className="flex justify-center py-16 animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
        <p className="text-sm text-white/30">Procesando métricas...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-teal-400" />
            <span className="text-[11px] font-semibold text-teal-400/70 uppercase tracking-[0.15em]">Analytics</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Métricas de la Clínica</h1>
          <p className="text-white/40 text-sm mt-1">Últimos 14 días · Datos en tiempo real</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
          <Activity className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-xs text-white/40">Actualización en vivo</span>
          <div className="w-2 h-2 bg-teal-400 rounded-full active-dot" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {[
          { label: "Ingresos estimados", value: formatCOP(totalIngresos), icon: DollarSign, gradient: "from-emerald-500/15 to-green-500/10", iconColor: "text-emerald-400", glow: "rgba(16,185,129,0.08)" },
          { label: "Citas agendadas",    value: totalCitas,               icon: CalendarCheck, gradient: "from-teal-500/15 to-cyan-500/10",   iconColor: "text-teal-400",    glow: "rgba(20,184,166,0.08)" },
          { label: "Pacientes nuevos",   value: totalPacientes,           icon: Users,         gradient: "from-sky-500/15 to-blue-500/10",    iconColor: "text-sky-400",     glow: "rgba(56,189,248,0.08)" },
          { label: "Conversión promedio", value: `${convRate}%`,           icon: TrendingUp,    gradient: "from-amber-500/15 to-yellow-500/10", iconColor: "text-amber-400",   glow: "rgba(245,158,11,0.08)" },
        ].map(({ label, value, icon: Icon, gradient, iconColor, glow }) => (
          <div key={label} className="stat-card" style={{ "--glow-color": glow } as React.CSSProperties}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 border border-white/5`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <p className="text-2xl font-extrabold text-white tracking-tight">{value}</p>
            <p className="text-xs text-white/30 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversaciones vs citas chart */}
        <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-white/80">Actividad diaria</h2>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPacientes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="fecha" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TooltipCustom />} />
              <Legend
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", paddingTop: "12px" }}
              />
              <Area type="monotone" dataKey="Conversaciones" stroke="#14b8a6" strokeWidth={2} fill="url(#gConv)" />
              <Area type="monotone" dataKey="Citas agendadas" stroke="#10b981" strokeWidth={2} fill="url(#gCitas)" />
              <Area type="monotone" dataKey="Pacientes nuevos" stroke="#38bdf8" strokeWidth={2} fill="url(#gPacientes)" strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Ingresos chart */}
        <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white/80">Ingresos estimados (COP)</h2>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ingresoData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="100%" stopColor="#0d9488" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="fecha" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => formatCOP(v)} />
              <Tooltip content={<TooltipCustom />} />
              <Bar dataKey="Ingresos" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tratamientos */}
      <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C9.5 2 7.5 3 6.5 4.5C5.5 6 5 8 5 10C5 12 5.5 13.5 6 15C6.5 16.5 7 18 7.5 20C7.8 21 8.5 22 9.5 22C10.5 22 11 21 11.5 19.5C11.8 18.5 12 17 12 17C12 17 12.2 18.5 12.5 19.5C13 21 13.5 22 14.5 22C15.5 22 16.2 21 16.5 20C17 18 17.5 16.5 18 15C18.5 13.5 19 12 19 10C19 8 18.5 6 17.5 4.5C16.5 3 14.5 2 12 2Z"
                  fill="#14b8a6" fillOpacity="0.6" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-white/80">Catálogo de Tratamientos Dentales</h2>
          </div>
          <span className="text-[10px] text-white/25 font-medium uppercase tracking-wider">{tratamientos.length} activos</span>
        </div>
        <div className="space-y-4">
          {tratamientos.map((t, i) => {
            const max = tratamientos[0]?.precio_cop ?? 1;
            const pct = Math.round((t.precio_cop / max) * 100);
            const colors = [
              "from-teal-500 to-cyan-500",
              "from-emerald-500 to-teal-500",
              "from-sky-500 to-blue-500",
              "from-violet-500 to-purple-500",
              "from-amber-500 to-yellow-500",
              "from-rose-500 to-pink-500",
              "from-cyan-500 to-blue-500",
              "from-green-500 to-emerald-500",
            ];
            return (
              <div key={i} className="group">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${colors[i % colors.length]}`} />
                    <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">{t.nombre}</span>
                  </div>
                  <span className="text-sm font-bold text-white/50 group-hover:text-white/70 transition-colors">{formatCOP(t.precio_cop)}</span>
                </div>
                <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.03]">
                  <div
                    className={`h-full bg-gradient-to-r ${colors[i % colors.length]} rounded-full transition-all duration-700 ease-out`}
                    style={{ width: `${pct}%`, opacity: 0.7 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center py-4">
        <p className="text-[10px] text-white/15 flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-teal-500/30" />
          Métricas actualizadas · Diego Mejía Dental Group
          <span className="w-1 h-1 rounded-full bg-teal-500/30" />
        </p>
      </div>
    </div>
  );
}
