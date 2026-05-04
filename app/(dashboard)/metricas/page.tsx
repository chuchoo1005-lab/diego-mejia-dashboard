"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, TrendingUp, MessageSquare, Users, Target } from "lucide-react";

interface DayData { fecha: string; conversaciones: number; pacientes: number; score_avg: number; }

const TooltipCustom = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-3 rounded-sm text-xs" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.1)" }}>
      <p className="mb-2 font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span style={{ color: "rgba(255,255,255,0.5)" }}>{p.name}:</span>
          <span className="font-semibold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function MetricasPage() {
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [totales, setTotales] = useState({ pacientes: 0, conversaciones: 0, calificados: 0, scoreAvg: 0 });
  const [servicios, setServicios] = useState<{ nombre: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const dias = 14;
    const desde = subDays(new Date(), dias - 1);
    desde.setHours(0, 0, 0, 0);

    const [{ data: pacs }, { data: convs }, { count: totalPacs }, { count: calificados }] = await Promise.all([
      supabase.from("pacientes").select("created_at,perfil_paciente").gte("created_at", desde.toISOString()).order("created_at"),
      supabase.from("conversaciones").select("timestamp").gte("timestamp", desde.toISOString()).order("timestamp"),
      supabase.from("pacientes").select("*", { count: "exact", head: true }),
      supabase.from("pacientes").select("*", { count: "exact", head: true }).eq("calificado", true),
    ]);

    // Build day-by-day data
    const days: Record<string, DayData> = {};
    for (let i = 0; i < dias; i++) {
      const d = format(subDays(new Date(), dias - 1 - i), "yyyy-MM-dd");
      const label = format(subDays(new Date(), dias - 1 - i), "d MMM", { locale: es });
      days[d] = { fecha: label, conversaciones: 0, pacientes: 0, score_avg: 0 };
    }

    (pacs || []).forEach(p => {
      const d = format(new Date(p.created_at), "yyyy-MM-dd");
      if (days[d]) days[d].pacientes++;
    });
    (convs || []).forEach(c => {
      const d = format(new Date(c.timestamp), "yyyy-MM-dd");
      if (days[d]) days[d].conversaciones++;
    });
    setDayData(Object.values(days));

    // Score promedio
    const { data: allPacs } = await supabase.from("pacientes").select("perfil_paciente").eq("estado", "activo").limit(500);
    let scoreSum = 0, scoreCount = 0;
    const servicioCount: Record<string, number> = {};
    (allPacs || []).forEach(p => {
      const score = parseInt(String(p.perfil_paciente?.score ?? "0")) || 0;
      if (score > 0) { scoreSum += score; scoreCount++; }
      const srv = p.perfil_paciente?.servicio_interes as string;
      if (srv) servicioCount[srv] = (servicioCount[srv] || 0) + 1;
    });

    setTotales({ pacientes: totalPacs ?? 0, conversaciones: convs?.length ?? 0, calificados: calificados ?? 0, scoreAvg: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0 });
    setServicios(Object.entries(servicioCount).map(([n, c]) => ({ nombre: n, count: c })).sort((a, b) => b.count - a.count));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const servicioLabel: Record<string, string> = { ortodoncia: "Ortodoncia", diseno: "Diseño de sonrisa", general: "Odontología general" };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-3">Análisis y reportes</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.9rem", fontWeight: 300 }}>Métricas</h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Últimos 14 días · Datos en tiempo real</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-sm" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
          <RefreshCw className="w-3 h-3" /> Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total pacientes", value: totales.pacientes, icon: Users },
          { label: "Conversaciones (14d)", value: totales.conversaciones, icon: MessageSquare },
          { label: "Calificados", value: totales.calificados, icon: Target },
          { label: "Score promedio", value: totales.scoreAvg, icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="dm-card p-4">
            <div className="w-6 h-6 rounded-sm flex items-center justify-center mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
              <Icon className="w-3 h-3" style={{ color: "var(--text-secondary)" }} />
            </div>
            <p className="text-2xl font-semibold text-white">{value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border border-white/20 border-t-white rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Gráfico conversaciones */}
          <div className="dm-card p-5">
            <div className="mb-4">
              <p className="section-label mb-1">Evolución temporal</p>
              <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", fontWeight: 500 }}>Conversaciones y pacientes nuevos</h2>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dayData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.06} />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipCustom />} />
                  <Area type="monotone" dataKey="conversaciones" name="Conversaciones" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5} fill="url(#cGrad)" />
                  <Area type="monotone" dataKey="pacientes" name="Pacientes nuevos" stroke="rgba(255,255,255,0.3)" strokeWidth={1} fill="url(#pGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Servicios más consultados */}
          {servicios.length > 0 && (
            <div className="dm-card p-5">
              <div className="mb-4">
                <p className="section-label mb-1">Demanda por tratamiento</p>
                <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", fontWeight: 500 }}>Servicios más consultados</h2>
              </div>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={servicios.map(s => ({ ...s, nombre: servicioLabel[s.nombre] ?? s.nombre }))} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<TooltipCustom />} />
                    <Bar dataKey="count" name="Consultas" fill="rgba(255,255,255,0.15)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Distribución de servicios texto */}
          {servicios.length > 0 && (
            <div className="dm-card p-5">
              <p className="section-label mb-4">Distribución de interés</p>
              <div className="space-y-3">
                {servicios.map(s => {
                  const total = servicios.reduce((a, b) => a + b.count, 0);
                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                  return (
                    <div key={s.nombre}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white">{servicioLabel[s.nombre] ?? s.nombre}</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>{s.count} ({pct}%)</span>
                      </div>
                      <div className="score-bar"><div className="score-bar-fill" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
