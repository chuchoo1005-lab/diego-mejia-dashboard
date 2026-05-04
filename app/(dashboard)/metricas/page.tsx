"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, TrendingUp, MessageSquare, Users, Target } from "lucide-react";

interface DayData { fecha: string; conversaciones: number; pacientes: number; }

const SRV: Record<string, string> = { ortodoncia: "Ortodoncia", diseno: "Diseño de sonrisa", general: "Odontología general" };

const Tip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-3 rounded-xl text-xs shadow-lg" style={{ background: "#FFF", border: "1px solid #E4E4E7" }}>
      <p className="font-semibold mb-2" style={{ color: "#111827" }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: "#6B7280" }}>{p.name}:</span>
          <span className="font-bold" style={{ color: "#111827" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function MetricasPage() {
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [totales, setTotales] = useState({ pacientes: 0, conversaciones: 0, calificados: 0, scoreAvg: 0 });
  const [servicios, setServicios] = useState<{ nombre: string; count: number; pct: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const dias = 14;
    const desde = subDays(new Date(), dias - 1); desde.setHours(0, 0, 0, 0);
    const [{ data: pacs }, { data: convs }, { count: totalPacs }, { count: calificados }] = await Promise.all([
      supabase.from("pacientes").select("created_at,perfil_paciente").gte("created_at", desde.toISOString()).order("created_at"),
      supabase.from("conversaciones").select("timestamp").gte("timestamp", desde.toISOString()),
      supabase.from("pacientes").select("*", { count: "exact", head: true }),
      supabase.from("pacientes").select("*", { count: "exact", head: true }).eq("calificado", true),
    ]);
    const days: Record<string, DayData> = {};
    for (let i = 0; i < dias; i++) {
      const d = format(subDays(new Date(), dias - 1 - i), "yyyy-MM-dd");
      days[d] = { fecha: format(subDays(new Date(), dias - 1 - i), "d MMM", { locale: es }), conversaciones: 0, pacientes: 0 };
    }
    (pacs || []).forEach(p => { const d = format(new Date(p.created_at), "yyyy-MM-dd"); if (days[d]) days[d].pacientes++; });
    (convs || []).forEach(c => { const d = format(new Date(c.timestamp), "yyyy-MM-dd"); if (days[d]) days[d].conversaciones++; });
    setDayData(Object.values(days));
    const { data: allPacs } = await supabase.from("pacientes").select("perfil_paciente").eq("estado", "activo").limit(500);
    let sum = 0; let cnt = 0; const srvCnt: Record<string, number> = {};
    (allPacs || []).forEach(p => {
      const s = parseInt(String(p.perfil_paciente?.score ?? "0")) || 0;
      if (s > 0) { sum += s; cnt++; }
      const srv = p.perfil_paciente?.servicio_interes as string;
      if (srv) srvCnt[srv] = (srvCnt[srv] || 0) + 1;
    });
    setTotales({ pacientes: totalPacs ?? 0, conversaciones: convs?.length ?? 0, calificados: calificados ?? 0, scoreAvg: cnt > 0 ? Math.round(sum / cnt) : 0 });
    const total = Object.values(srvCnt).reduce((a, b) => a + b, 0);
    setServicios(Object.entries(srvCnt).map(([n, c]) => ({ nombre: n, count: c, pct: total > 0 ? Math.round((c / total) * 100) : 0 })).sort((a, b) => b.count - a.count));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Análisis y reportes</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)" }}>Métricas</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Últimos 14 días · Datos en tiempo real</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total pacientes", value: totales.pacientes, icon: Users },
          { label: "Conversaciones (14d)", value: totales.conversaciones, icon: MessageSquare },
          { label: "Calificados", value: totales.calificados, icon: Target },
          { label: "Score promedio", value: totales.scoreAvg, icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="dm-card p-5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: "#F4F4F6" }}>
              <Icon className="w-4 h-4" style={{ color: "#6B7280" }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="dm-card p-6">
            <p className="section-label mb-1">Evolución temporal</p>
            <h2 className="font-semibold mb-5" style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", color: "var(--text)" }}>
              Conversaciones y pacientes nuevos
            </h2>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dayData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="cG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#111827" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#111827" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6B7280" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#6B7280" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="conversaciones" name="Conversaciones" stroke="#111827" strokeWidth={2} fill="url(#cG)" />
                  <Area type="monotone" dataKey="pacientes" name="Pacientes nuevos" stroke="#9CA3AF" strokeWidth={1.5} fill="url(#pG)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {servicios.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="dm-card p-6">
                <p className="section-label mb-1">Por tratamiento</p>
                <h2 className="font-semibold mb-5" style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", color: "var(--text)" }}>
                  Servicios consultados
                </h2>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={servicios.map(s => ({ ...s, nombre: SRV[s.nombre] ?? s.nombre }))} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                      <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="count" name="Consultas" fill="#111827" radius={[4, 4, 0, 0]} opacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="dm-card p-6">
                <p className="section-label mb-1">Distribución</p>
                <h2 className="font-semibold mb-5" style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", color: "var(--text)" }}>
                  Interés por tratamiento
                </h2>
                <div className="space-y-4">
                  {servicios.map(s => (
                    <div key={s.nombre}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{SRV[s.nombre] ?? s.nombre}</span>
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{s.count} ({s.pct}%)</span>
                      </div>
                      <div className="score-bar h-2"><div className="score-bar-fill" style={{ width: `${s.pct}%`, height: "100%", background: "#111827" }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
