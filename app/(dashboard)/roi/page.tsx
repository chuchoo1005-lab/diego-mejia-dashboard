"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { TrendingUp, DollarSign, Users, MessageSquare, Target, RefreshCw } from "lucide-react";

const PRECIOS: Record<string, number> = {
  ortodoncia_invisible: 10000000,
  diseno_sonrisa: 3000000,
  general: 150000,
};

const PRECIO_LABELS: Record<string, string> = {
  ortodoncia_invisible: "Ortodoncia invisible",
  diseno_sonrisa: "Diseño de sonrisa",
  general: "Valoración",
};

const COP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, notation: n >= 1000000 ? "compact" : "standard" }).format(n);

export default function ROIPage() {
  const [data, setData] = useState({
    totalLeads: 0, leadsCalificados: 0, leadsListos: 0,
    conversionRate: 0, ingresoEstimado: 0,
    porServicio: [] as { servicio: string; cantidad: number; ingreso: number }[],
    conversacionesTotales: 0, tiempoAhorrado: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: pacs }, { count: convs }] = await Promise.all([
      supabase.from("pacientes").select("perfil_paciente,calificado").eq("estado", "activo"),
      supabase.from("conversaciones").select("*", { count: "exact", head: true }),
    ]);

    const todos = pacs || [];
    const calificados = todos.filter(p => p.calificado).length;
    const listos = todos.filter(p => (p.perfil_paciente as Record<string,unknown>)?.estado_conv === "entrega_premium").length;
    const convRate = todos.length > 0 ? Math.round((listos / todos.length) * 100) : 0;

    // Ingreso estimado por servicio
    const srvCount: Record<string, number> = {};
    todos.forEach(p => {
      const srv = ((p.perfil_paciente as Record<string,unknown>)?.servicio_interes as string);
      if (srv) srvCount[srv] = (srvCount[srv] || 0) + 1;
    });

    const porServicio = Object.entries(srvCount).map(([s, q]) => ({
      servicio: s,
      cantidad: q,
      ingreso: q * (PRECIOS[s] ?? 500000) * 0.3, // 30% tasa conversión estimada
    })).sort((a, b) => b.ingreso - a.ingreso);

    const ingresoTotal = porServicio.reduce((sum, s) => sum + s.ingreso, 0);
    // Tiempo ahorrado: ~15 min por conversación que maneja el agente
    const tiempoMin = (convs ?? 0) * 15;

    setData({
      totalLeads: todos.length,
      leadsCalificados: calificados,
      leadsListos: listos,
      conversionRate: convRate,
      ingresoEstimado: ingresoTotal,
      porServicio,
      conversacionesTotales: convs ?? 0,
      tiempoAhorrado: tiempoMin,
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const metricas = [
    {
      label: "Ingreso estimado potencial",
      value: COP(data.ingresoEstimado),
      sub: "Con 30% de conversión de leads activos",
      icon: DollarSign,
      color: "var(--green)",
    },
    {
      label: "Leads gestionados",
      value: data.totalLeads.toString(),
      sub: `${data.leadsCalificados} calificados · ${data.leadsListos} listos`,
      icon: Users,
      color: "var(--cyan)",
    },
    {
      label: "Conversaciones procesadas",
      value: data.conversacionesTotales.toLocaleString("es-CO"),
      sub: "Por el agente IA automáticamente",
      icon: MessageSquare,
      color: "#A78BFA",
    },
    {
      label: "Tiempo ahorrado al equipo",
      value: data.tiempoAhorrado >= 60 ? `${Math.round(data.tiempoAhorrado / 60)}h` : `${data.tiempoAhorrado}min`,
      sub: "≈15 min por conversación automatizada",
      icon: Target,
      color: "var(--amber)",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Análisis financiero</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)" }}>
            Retorno de Inversión
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            Estimación basada en leads activos y tasas de conversión
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(6,182,212,0.2)", borderTopColor: "var(--cyan)" }} />
        </div>
      ) : (
        <>
          {/* KPIs principales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metricas.map(m => (
              <div key={m.label} className="dm-card p-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${m.color}18` }}>
                  <m.icon className="w-4 h-4" style={{ color: m.color }} />
                </div>
                <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-sm font-medium mt-1" style={{ color: "var(--text)" }}>{m.label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Tasa de conversión */}
          <div className="dm-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="section-label mb-1">Pipeline de ventas</p>
                <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", fontWeight: 500, color: "var(--text)" }}>
                  Embudo de conversión
                </h2>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black" style={{ color: "var(--cyan)" }}>{data.conversionRate}%</p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>tasa actual</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "Total leads recibidos", value: data.totalLeads, pct: 100, color: "rgba(255,255,255,0.2)" },
                { label: "Leads calificados", value: data.leadsCalificados, pct: data.totalLeads > 0 ? Math.round(data.leadsCalificados / data.totalLeads * 100) : 0, color: "#A78BFA" },
                { label: "Listos para valoración", value: data.leadsListos, pct: data.totalLeads > 0 ? Math.round(data.leadsListos / data.totalLeads * 100) : 0, color: "var(--cyan)" },
              ].map(({ label, value, pct, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm" style={{ color: "var(--text)" }}>{label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{value}</span>
                      <span className="text-xs w-10 text-right" style={{ color: "var(--text-3)" }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Por servicio */}
          {data.porServicio.length > 0 && (
            <div className="dm-card p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <TrendingUp className="w-4 h-4" style={{ color: "var(--cyan)" }} />
                <div>
                  <p className="section-label mb-0.5">Potencial por tratamiento</p>
                  <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", fontWeight: 500, color: "var(--text)" }}>
                    Ingreso estimado por servicio
                  </h2>
                </div>
              </div>
              <div className="space-y-3">
                {data.porServicio.map(s => (
                  <div key={s.servicio} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.025)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{PRECIO_LABELS[s.servicio] ?? s.servicio}</p>
                      <p className="text-xs" style={{ color: "var(--text-3)" }}>{s.cantidad} leads · precio base {COP(PRECIOS[s.servicio] ?? 500000)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black" style={{ color: "var(--green)" }}>{COP(s.ingreso)}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-3)" }}>potencial (30% conv.)</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Total potencial</p>
                <p className="text-xl font-black" style={{ color: "var(--green)" }}>{COP(data.ingresoEstimado)}</p>
              </div>
            </div>
          )}

          {/* Valor del sistema */}
          <div className="dm-card-glow p-5">
            <p className="section-label mb-3" style={{ color: "rgba(6,182,212,0.5)" }}>Valor del sistema IA</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Ahorro en tiempo del equipo", calc: `${data.conversacionesTotales} conv × 15min = ${Math.round(data.tiempoAhorrado / 60)}h ahorradas`, value: COP(Math.round(data.tiempoAhorrado / 60) * 25000) },
                { label: "Disponibilidad 24/7", calc: "El agente responde fuera del horario de oficina", value: "∞" },
                { label: "Seguimientos automáticos", calc: "Sin olvidar leads. WF-07 corre cada 30 min", value: "100%" },
              ].map(({ label, calc, value }) => (
                <div key={label} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-lg font-black mb-1" style={{ color: "var(--cyan)" }}>{value}</p>
                  <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--text)" }}>{label}</p>
                  <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{calc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-center" style={{ color: "var(--text-3)", fontFamily: "var(--font-cormorant)", fontStyle: "italic" }}>
            Los ingresos son estimaciones basadas en precios promedio y una tasa de conversión del 30%.
            Los valores reales dependen de la evolución de cada caso.
          </p>
        </>
      )}
    </div>
  );
}
