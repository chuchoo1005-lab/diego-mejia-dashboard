"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Activity, RefreshCw } from "lucide-react";

interface Paciente {
  id: string; alias: string; telefono_encriptado: string | null;
  perfil_paciente: Record<string, unknown>; created_at: string; updated_at: string;
}

type Tab = "activos" | "convertidos" | "cancelados" | "completados";

const SRV: Record<string, string> = {
  ortodoncia: "Ortodoncia", diseno: "Diseño de sonrisa", general: "Odontología general",
  invisalign: "Invisalign", implantes: "Implantes", blanqueamiento: "Blanqueamiento",
  endodoncia: "Endodoncia", periodoncia: "Periodoncia", cirugia: "Cirugía oral",
  rehabilitacion: "Rehabilitación", odontopediatria: "Odontopediatría",
};

const TOTAL = 12;

function formatTel(t: string | null): string {
  if (!t) return "";
  const c = t.replace(/\D/g, "");
  if (c.length >= 10 && c.startsWith("57")) return `+57 ${c.slice(2, 5)} ${c.slice(5, 8)} ${c.slice(8)}`;
  if (c.length === 10) return `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6)}`;
  return t;
}
function displayName(p: Paciente): string {
  return (p.perfil_paciente?.nombre as string)
    || (p.perfil_paciente?.nombre_whatsapp as string)
    || formatTel(p.telefono_encriptado)
    || "Lead";
}
const numSeg = (p: Paciente) => parseInt(String(p.perfil_paciente?.seguimientos_enviados ?? "0")) || 0;
const esSeg = (p: Paciente) => (p.perfil_paciente?.estado_seguimiento as string) || "pendiente";
const esConv = (p: Paciente) => (p.perfil_paciente?.estado_conv as string) || "nuevo";
const servicio = (p: Paciente) => (p.perfil_paciente?.servicio_interes as string) || null;
const ultimoSegAt = (p: Paciente) => {
  const v = p.perfil_paciente?.ultimo_seguimiento_at as string;
  return v ? new Date(v) : null;
};

export default function SeguimientosPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [tab, setTab] = useState<Tab>("activos");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pacientes")
      .select("id,alias,telefono_encriptado,perfil_paciente,created_at,updated_at")
      .eq("estado", "activo")
      .order("updated_at", { ascending: false })
      .limit(300);
    setPacientes((data || []) as Paciente[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Pipeline — exclude leads that never entered seguimiento AND never reached cita_agendada
  const pipeline = pacientes.filter(p => {
    const ns = numSeg(p); const es_ = esSeg(p); const ec = esConv(p);
    return ns > 0 || es_ === "activo" || es_ === "cancelado" || es_ === "completado" || (ns === 0 && ec === "cita_agendada");
  });

  const activos    = pipeline.filter(p => esSeg(p) === "activo");
  const convertidos = pipeline.filter(p => esConv(p) === "cita_agendada");
  const cancelados  = pipeline.filter(p => esSeg(p) === "cancelado");
  const completados = pipeline.filter(p => esSeg(p) === "completado" && esConv(p) !== "cita_agendada");

  const TABS: { key: Tab; label: string; count: number; color: string; accent: string }[] = [
    { key: "activos",     label: "En seguimiento", count: activos.length,     color: "#06B6D4", accent: "rgba(6,182,212,0.15)"   },
    { key: "convertidos", label: "Convirtieron",   count: convertidos.length, color: "#10B981", accent: "rgba(16,185,129,0.15)"  },
    { key: "cancelados",  label: "Cancelaron",     count: cancelados.length,  color: "#EF4444", accent: "rgba(239,68,68,0.12)"   },
    { key: "completados", label: "Sin convertir",  count: completados.length, color: "#6B7280", accent: "rgba(107,114,128,0.12)" },
  ];

  const current = tab === "activos" ? activos : tab === "convertidos" ? convertidos : tab === "cancelados" ? cancelados : completados;
  const activeTab = TABS.find(t => t.key === tab)!;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Pipeline de conversión</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)" }}>Seguimientos</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{pipeline.length} leads en el pipeline</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* KPI cards — también actúan como tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {TABS.map(({ key, label, count, color, accent }) => (
          <button key={key} onClick={() => setTab(key)}
            className="dm-card p-4 text-left transition-all cursor-pointer"
            style={{
              outline: tab === key ? `2px solid ${color}` : "none",
              outlineOffset: "-1px",
              background: tab === key ? accent : undefined,
            }}>
            <p className="text-2xl font-bold" style={{ color: tab === key ? color : "var(--text)" }}>{count}</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
          </button>
        ))}
      </div>

      {/* Pill tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label, count, color }) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-4 py-1.5 text-sm font-medium rounded-full transition-all"
            style={{
              background: tab === key ? color : "var(--card)",
              color: tab === key ? "#FFF" : "var(--text-secondary)",
              border: "1px solid", borderColor: tab === key ? color : "var(--border)",
              boxShadow: tab === key ? `0 2px 8px ${color}30` : undefined,
            }}>
            {label} ({count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
        </div>
      ) : current.length === 0 ? (
        <div className="dm-card py-16 text-center">
          <Activity className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin registros en esta categoría</p>
        </div>
      ) : (
        <>
          {/* ─── Desktop tabla ─── */}
          <div className="dm-card overflow-x-auto hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#FAFAFA", borderBottom: "1px solid var(--border)" }}>
                  {["Lead / Teléfono", "Servicio", "Seguimiento", "Progreso", "Último contacto",
                    tab === "convertidos" ? "Conversión" : "Estado conv."
                  ].map(h => (
                    <th key={h} className="text-left px-5 py-3 section-label whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {current.map(p => {
                  const n = numSeg(p); const svc = servicio(p); const ul = ultimoSegAt(p);
                  const nom = displayName(p); const tel = formatTel(p.telefono_encriptado);
                  const isConv = esConv(p) === "cita_agendada";
                  const pct = Math.min(Math.round((n / TOTAL) * 100), 100);
                  const barColor = isConv ? "#10B981" : esSeg(p) === "cancelado" ? "#EF4444" : activeTab.color;
                  return (
                    <tr key={p.id} className="table-row-hover" style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold" style={{ color: "var(--text)" }}>{nom}</p>
                        {tel && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{tel}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {svc ? (SRV[svc] ?? svc) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold" style={{ color: "var(--text)" }}>{n}</span>
                        <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>/ {TOTAL}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="w-28 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{pct}%</p>
                      </td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-muted)" }}>
                        {ul ? formatDistanceToNow(ul, { addSuffix: true, locale: es }) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {isConv ? (
                          <span className="badge badge-green">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Cita agendada
                          </span>
                        ) : (
                          <span className="badge badge-gray"
                            style={esSeg(p) === "cancelado" ? { color: "#EF4444", borderColor: "rgba(239,68,68,0.3)" } : undefined}>
                            {esSeg(p) === "cancelado" ? "No interesado" : esSeg(p) === "completado" ? "Ciclo completo" : esConv(p)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ─── Mobile cards ─── */}
          <div className="sm:hidden space-y-3">
            {current.map(p => {
              const n = numSeg(p); const svc = servicio(p); const ul = ultimoSegAt(p);
              const nom = displayName(p); const tel = formatTel(p.telefono_encriptado);
              const isConv = esConv(p) === "cita_agendada";
              const isCancelado = esSeg(p) === "cancelado";
              const pct = Math.min(Math.round((n / TOTAL) * 100), 100);
              const barColor = isConv ? "#10B981" : isCancelado ? "#EF4444" : activeTab.color;
              return (
                <div key={p.id} className="dm-card p-4 space-y-3">

                  {/* Row 1: nombre + badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{nom}</p>
                      {tel && <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{tel}</p>}
                    </div>
                    {isConv ? (
                      <span className="badge badge-green shrink-0 text-xs">✓ Convirtió</span>
                    ) : isCancelado ? (
                      <span className="badge badge-gray shrink-0 text-xs" style={{ color: "#EF4444", borderColor: "rgba(239,68,68,0.3)" }}>Canceló</span>
                    ) : (
                      <span className="badge badge-gray shrink-0 text-xs" style={{ color: activeTab.color }}>Activo</span>
                    )}
                  </div>

                  {/* Row 2: servicio + paso */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {svc ? (SRV[svc] ?? svc) : "Sin servicio"}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                      Paso {n} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>/ {TOTAL}</span>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: barColor }} />
                  </div>

                  {/* Row 3: último contacto */}
                  {ul && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Último contacto: {formatDistanceToNow(ul, { addSuffix: true, locale: es })}
                    </p>
                  )}

                  {/* Conversion highlight */}
                  {isConv && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <span className="text-xs font-medium" style={{ color: "#10B981" }}>
                        🎉 Convirtió después de {n} seguimiento{n !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
