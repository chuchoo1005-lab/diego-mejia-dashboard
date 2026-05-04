"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquare, Users, CheckCircle, Flame, RefreshCw, TrendingUp, ArrowUpRight, Activity } from "lucide-react";

interface Paciente {
  id: string; alias: string; estado: string; calificado: boolean;
  perfil_paciente: Record<string, unknown>; created_at: string; updated_at: string;
}
interface Sugerencia {
  tipo: "caliente" | "seguimiento" | "referido" | "nuevo";
  alias: string; accion: string; servicio: string | null; score: number;
}

const servicioLabel: Record<string, string> = { ortodoncia: "Ortodoncia", diseno: "Diseño de sonrisa", general: "Odontología general" };

function getScore(p: Paciente) { return parseInt(String(p.perfil_paciente?.score ?? "0")) || 0; }
function getServicio(p: Paciente) { return (p.perfil_paciente?.servicio_interes as string) || null; }
function getNivel(p: Paciente) { return (p.perfil_paciente?.nivel_interes as string) || "bajo"; }
function getEstadoConv(p: Paciente) { return (p.perfil_paciente?.estado_conv as string) || "nuevo"; }
function getUA(p: Paciente) {
  const ua = p.perfil_paciente?.ultima_actividad_at as string;
  return ua ? new Date(ua) : new Date(p.updated_at);
}

function buildSugerencias(pacientes: Paciente[]): Sugerencia[] {
  const sugs: Sugerencia[] = [];
  const now = Date.now();
  pacientes.forEach(p => {
    const score = getScore(p); const servicio = getServicio(p);
    const estadoConv = getEstadoConv(p);
    const horasSin = (now - getUA(p).getTime()) / 3600000;
    const tipoIntencion = p.perfil_paciente?.tipo_intencion as string;
    if (tipoIntencion === "referido" && score >= 10) sugs.push({ tipo: "referido", alias: p.alias, accion: "Referido nuevo — alta prioridad", servicio, score });
    else if (score >= 70) sugs.push({ tipo: "caliente", alias: p.alias, accion: "Lead caliente — confirmar valoración", servicio, score });
    else if (horasSin > 48 && score >= 20 && estadoConv !== "entrega_premium") sugs.push({ tipo: "seguimiento", alias: p.alias, accion: `Sin respuesta ${Math.round(horasSin)}h — enviar recordatorio`, servicio, score });
    else if (estadoConv === "nuevo" && horasSin < 2) sugs.push({ tipo: "nuevo", alias: p.alias, accion: "Lead nuevo — responder pronto", servicio, score });
  });
  return sugs.sort((a, b) => b.score - a.score).slice(0, 6);
}

export default function Home() {
  const [kpis, setKpis] = useState({ totalPacientes: 0, pacientesHoy: 0, convsHoy: 0, calificados: 0, leadsCalientes: 0 });
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      const [{ count: total }, { count: nuevosHoy }, { count: convsHoy }, { count: calificados }, { data: pacs }] = await Promise.all([
        supabase.from("pacientes").select("*", { count: "exact", head: true }),
        supabase.from("pacientes").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
        supabase.from("conversaciones").select("*", { count: "exact", head: true }).gte("timestamp", todayISO),
        supabase.from("pacientes").select("*", { count: "exact", head: true }).eq("calificado", true),
        supabase.from("pacientes").select("id,alias,estado,calificado,perfil_paciente,created_at,updated_at").eq("estado", "activo").order("updated_at", { ascending: false }).limit(30),
      ]);
      const pacsData = (pacs || []) as Paciente[];
      const calientes = pacsData.filter(p => getScore(p) >= 60).length;
      setKpis({ totalPacientes: total ?? 0, pacientesHoy: nuevosHoy ?? 0, convsHoy: convsHoy ?? 0, calificados: calificados ?? 0, leadsCalientes: calientes });
      setPacientes(pacsData);
      setSugerencias(buildSugerencias(pacsData));
      setLastUpdate(new Date());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Cargando...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-3">Panel de control</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 300, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
            Diego Mejía<br /><span style={{ fontWeight: 600 }}>Dental Group</span>
          </h1>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <Activity className="w-3 h-3" />
            <span>Activo</span>
            <div className="w-1.5 h-1.5 bg-white rounded-full active-dot" />
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <RefreshCw className="w-3 h-3" />
            <span>{format(lastUpdate, "HH:mm:ss")}</span>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total pacientes", value: kpis.totalPacientes, icon: Users },
          { label: "Nuevos hoy", value: kpis.pacientesHoy, icon: TrendingUp },
          { label: "Conversaciones hoy", value: kpis.convsHoy, icon: MessageSquare },
          { label: "Calificados", value: kpis.calificados, icon: CheckCircle },
          { label: "Leads calientes", value: kpis.leadsCalientes, icon: Flame, highlight: true },
        ].map(({ label, value, icon: Icon, highlight }, i) => (
          <div key={label} className="dm-card p-4 animate-fade-up" style={{ animationDelay: `${i * 50}ms`, ...(highlight ? { borderColor: "rgba(255,255,255,0.15)" } : {}) }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                <Icon className="w-3.5 h-3.5" style={{ color: highlight ? "#FFFFFF" : "var(--text-secondary)" }} />
              </div>
              {highlight && <div className="w-1.5 h-1.5 bg-white rounded-full active-dot" />}
            </div>
            <p className="text-2xl font-semibold text-white">{value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Sugerencias + Actividad ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="dm-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-label mb-1">IA · Acciones recomendadas</p>
              <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", fontWeight: 500 }}>Sugerencias del sistema</h2>
            </div>
            <span className="text-xs px-2 py-1 rounded-sm" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>{sugerencias.length}</span>
          </div>
          {sugerencias.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Sin sugerencias activas</p>
          ) : (
            <div className="space-y-2">
              {sugerencias.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-sm" style={{ background: "rgba(255,255,255,0.02)", borderLeft: `2px solid ${s.tipo === "caliente" || s.tipo === "referido" ? "#FFF" : "#444"}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-white">{s.alias}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm capitalize" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>{s.tipo}</span>
                    </div>
                    <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{s.accion}</p>
                    {s.servicio && <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{servicioLabel[s.servicio] ?? s.servicio}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white">{s.score}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>score</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dm-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-label mb-1">Actividad reciente</p>
              <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", fontWeight: 500 }}>Pacientes en conversación</h2>
            </div>
            <a href="/pacientes" className="flex items-center gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>Ver todos <ArrowUpRight className="w-3 h-3" /></a>
          </div>
          <div className="space-y-1">
            {pacientes.slice(0, 7).map(p => {
              const score = getScore(p); const nivel = getNivel(p); const servicio = getServicio(p); const ua = getUA(p);
              return (
                <div key={p.id} className="flex items-center gap-3 px-2 py-2.5 rounded-sm hover:bg-white/[0.02] transition-colors">
                  <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
                    {p.alias.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.alias}</p>
                    <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                      {servicio ? (servicioLabel[servicio] ?? servicio) : "Sin servicio"} · {formatDistanceToNow(ua, { locale: es, addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${nivel === "alto" ? "text-white" : nivel === "medio" ? "text-white/60" : "text-white/30"}`}>{score}</p>
                    <div className="score-bar w-10 mt-1"><div className="score-bar-fill" style={{ width: `${score}%` }} /></div>
                  </div>
                </div>
              );
            })}
            {pacientes.length === 0 && <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Sin actividad reciente</p>}
          </div>
        </div>
      </div>

      {/* ── Tabla pacientes ── */}
      <div className="dm-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="section-label mb-1">Gestión de leads</p>
            <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", fontWeight: 500 }}>Todos los pacientes activos</h2>
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{pacientes.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Alias", "Estado conversación", "Servicio", "Score", "Calificado", "Última actividad"].map(h => (
                  <th key={h} className="text-left pb-3 pr-4 section-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pacientes.map(p => {
                const score = getScore(p); const servicio = getServicio(p);
                const estadoConv = getEstadoConv(p); const ua = getUA(p);
                const horasOld = differenceInHours(new Date(), ua);
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 pr-4 font-medium text-white">{p.alias}</td>
                    <td className="py-3 pr-4"><span className="text-xs px-2 py-1 rounded-sm" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>{estadoConv}</span></td>
                    <td className="py-3 pr-4" style={{ color: "var(--text-secondary)" }}>{servicio ? (servicioLabel[servicio] ?? servicio) : "—"}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${score >= 60 ? "text-white" : score >= 30 ? "text-white/60" : "text-white/30"}`}>{score}</span>
                        <div className="score-bar w-14"><div className="score-bar-fill" style={{ width: `${score}%` }} /></div>
                      </div>
                    </td>
                    <td className="py-3 pr-4"><span className={`text-xs ${p.calificado ? "text-white" : "text-white/30"}`}>{p.calificado ? "✓ Sí" : "—"}</span></td>
                    <td className="py-3"><span className="text-xs" style={{ color: horasOld > 48 ? "var(--text-muted)" : "var(--text-secondary)" }}>{formatDistanceToNow(ua, { locale: es, addSuffix: true })}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pacientes.length === 0 && <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Sin pacientes activos</p>}
        </div>
      </div>

      <div className="text-center py-2">
        <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-cormorant)", fontStyle: "italic" }}>Diego Mejía Dental Group · Creamos Estilos de Vida</p>
      </div>
    </div>
  );
}
