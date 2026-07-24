"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { SRV } from "@/components/CallCard";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Activity, RefreshCw, Phone, MapPin } from "lucide-react";

interface Paciente {
  id: string; alias: string; telefono_encriptado: string | null;
  perfil_paciente: Record<string, unknown>; created_at: string; updated_at: string;
}

type Tab = "activos" | "convertidos" | "cancelados" | "completados";

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
const score = (p: Paciente) => parseInt(String(p.perfil_paciente?.score ?? "0")) || 0;
const ciudad = (p: Paciente) => (p.perfil_paciente?.ciudad as string) || null;
const nivel = (p: Paciente) => (p.perfil_paciente?.nivel_interes as string) || "bajo";
const telContacto = (p: Paciente) => {
  const t = (p.perfil_paciente?.telefono_contacto as string) || p.telefono_encriptado || "";
  const c = t.replace(/\D/g, "");
  if (c.length >= 10 && c.startsWith("57")) return `+57 ${c.slice(2,5)} ${c.slice(5,8)} ${c.slice(8)}`;
  return t || null;
};
const waLink = (p: Paciente) => {
  const t = ((p.perfil_paciente?.telefono_contacto as string) || p.telefono_encriptado || "").replace(/\D/g,"");
  return t ? `https://wa.me/${t.startsWith("57") ? t : "57"+t}` : null;
};
const NIVEL_CFG: Record<string, { label: string; color: string; bg: string }> = {
  alto:  { label: "🔥 Alto",   color: "#F97316", bg: "rgba(249,115,22,0.1)" },
  medio: { label: "🤔 Medio",  color: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
  bajo:  { label: "💤 Bajo",   color: "#6B7280", bg: "rgba(107,114,128,0.08)" },
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

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  // Sincronización en tiempo real: si alguien mueve un lead desde otro dispositivo, se refleja aquí al instante
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel("realtime-pacientes-seguimientos")
      .on("postgres_changes", { event: "*", schema: "public", table: "pacientes" }, () => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(load, 800);
      })
      .subscribe();
    return () => { if (timeout) clearTimeout(timeout); supabase.removeChannel(channel); };
  }, [load]);

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
                  {["Lead", "Servicio · Ciudad", "Interés", "Seguimiento", "Progreso", "Último contacto", "Acciones"].map(h => (
                    <th key={h} className="text-left px-4 py-3 section-label whitespace-nowrap">{h}</th>
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
                  const sc = score(p); const ciu = ciudad(p); const niv = nivel(p);
                  const telC = telContacto(p); const wa = waLink(p);
                  const nivCfg = NIVEL_CFG[niv] ?? NIVEL_CFG.bajo;
                  return (
                    <tr key={p.id} className="table-row-hover" style={{ borderBottom: "1px solid #F3F4F6" }}>
                      {/* Lead */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{nom}</p>
                        {tel && <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{tel}</p>}
                        <p className="text-[13px] mt-0.5 font-bold" style={{ color: sc >= 60 ? "var(--cyan)" : sc >= 30 ? "#FBBF24" : "var(--text-muted)" }}>
                          {sc} pts
                        </p>
                      </td>
                      {/* Servicio + Ciudad */}
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {svc ? (SRV[svc] ?? svc) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                        </p>
                        {ciu && (
                          <p className="text-sm mt-0.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                            <MapPin className="w-2.5 h-2.5" />{ciu}
                          </p>
                        )}
                      </td>
                      {/* Nivel */}
                      <td className="px-4 py-3">
                        <span className="text-[14px] font-semibold px-2 py-0.5 rounded-full" style={{ background: nivCfg.bg, color: nivCfg.color }}>
                          {nivCfg.label}
                        </span>
                      </td>
                      {/* Seguimiento */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-sm" style={{ color: "var(--text)" }}>{n}</span>
                        <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>/ {TOTAL}</span>
                      </td>
                      {/* Progreso */}
                      <td className="px-4 py-3">
                        <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                        <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>{pct}%</p>
                      </td>
                      {/* Último contacto */}
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                        {ul ? formatDistanceToNow(ul, { addSuffix: true, locale: es }) : "—"}
                      </td>
                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {telC && (
                            <a href={`tel:${telC.replace(/\s/g,"")}`}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-bold"
                              style={{ background:"rgba(16,185,129,0.1)", color:"#10B981", border:"1px solid rgba(16,185,129,0.25)" }}>
                              <Phone className="w-3 h-3" /> Llamar
                            </a>
                          )}
                          {wa && (
                            <a href={wa} target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-center w-7 h-7 rounded-lg text-sm"
                              style={{ background:"rgba(37,211,102,0.1)", color:"#25D366", border:"1px solid rgba(37,211,102,0.2)" }}>
                              💬
                            </a>
                          )}
                        </div>
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
              const telC = telContacto(p); const wa = waLink(p);
              const scr = score(p); const ciu = ciudad(p); const niv_ = nivel(p);
              const nivCfg = NIVEL_CFG[niv_] ?? NIVEL_CFG.bajo;
              return (
                <div key={p.id} className="dm-card p-4 space-y-3">

                  {/* Row 1: nombre + score + badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{nom}</p>
                      {tel && <p className="text-sm mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{tel}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-black px-2 py-0.5 rounded-full"
                        style={{ background: scr >= 60 ? "rgba(6,182,212,0.12)" : scr >= 30 ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.05)", color: scr >= 60 ? "var(--cyan)" : scr >= 30 ? "#FBBF24" : "var(--text-muted)" }}>
                        {scr} pts
                      </span>
                      {isConv ? (
                        <span className="badge badge-green text-sm">✓ Convirtió</span>
                      ) : isCancelado ? (
                        <span className="badge badge-gray text-sm" style={{ color: "#EF4444", borderColor: "rgba(239,68,68,0.3)" }}>Canceló</span>
                      ) : (
                        <span className="badge badge-gray text-sm" style={{ color: activeTab.color }}>Activo</span>
                      )}
                    </div>
                  </div>

                  {/* Row tags: servicio + interés + ciudad */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm px-2 py-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                      {svc ? (SRV[svc] ?? svc) : "Sin servicio"}
                    </span>
                    <span className="text-[14px] font-semibold px-2 py-0.5 rounded-full" style={{ background: nivCfg.bg, color: nivCfg.color }}>
                      {nivCfg.label}
                    </span>
                    {ciu && (
                      <span className="text-sm flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                        <MapPin className="w-2.5 h-2.5" />{ciu}
                      </span>
                    )}
                  </div>

                  {/* Row Acciones: llamar + whatsapp */}
                  {(telC || wa) && (
                    <div className="flex gap-2">
                      {telC && (
                        <a href={`tel:${telC.replace(/\s/g,"")}`}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold"
                          style={{ background:"rgba(16,185,129,0.1)", color:"#10B981", border:"1px solid rgba(16,185,129,0.25)" }}>
                          <Phone className="w-3.5 h-3.5" /> Llamar
                        </a>
                      )}
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold"
                          style={{ background:"rgba(37,211,102,0.1)", color:"#25D366", border:"1px solid rgba(37,211,102,0.2)" }}>
                          💬 Mensaje
                        </a>
                      )}
                    </div>
                  )}

                  {/* Row 2: progreso */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>Seguimiento</span>
                    <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
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
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Último contacto: {formatDistanceToNow(ul, { addSuffix: true, locale: es })}
                    </p>
                  )}

                  {/* Conversion highlight */}
                  {isConv && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <span className="text-sm font-medium" style={{ color: "#10B981" }}>
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
