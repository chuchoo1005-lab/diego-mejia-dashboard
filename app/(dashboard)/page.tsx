"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Brain, Flame, Clock, MessageSquare, Users, TrendingUp, ArrowRight, Zap, Activity, Phone } from "lucide-react";

interface Paciente {
  id: string; alias: string; calificado: boolean;
  telefono_encriptado: string | null;
  perfil_paciente: Record<string, unknown>; created_at: string; updated_at: string;
}
interface Conv {
  id: string; paciente_id: string; direccion: string;
  mensaje_encriptado: string; timestamp: string;
  metadata: Record<string, unknown>;
}

const SRV: Record<string, string> = { ortodoncia: "Ortodoncia invisible", diseno: "Diseño de sonrisa", general: "Odontología general" };

function tel(p: Paciente): string {
  const t = p.telefono_encriptado; if (!t) return "";
  const c = t.replace(/\D/g, "");
  if (c.length >= 10 && c.startsWith("57")) return `+57 ${c.slice(2,5)} ${c.slice(5,8)} ${c.slice(8)}`;
  return t;
}
function nom(p: Paciente) { return (p.perfil_paciente?.nombre as string) || tel(p) || p.alias; }
function sc(p: Paciente) { return parseInt(String(p.perfil_paciente?.score ?? "0")) || 0; }
function ec(p: Paciente) { return (p.perfil_paciente?.estado_conv as string) || "nuevo"; }
function srv(p: Paciente) { return (p.perfil_paciente?.servicio_interes as string) || null; }
function niv(p: Paciente) { return (p.perfil_paciente?.nivel_interes as string) || "bajo"; }
function ua(p: Paciente) { const v = p.perfil_paciente?.ultima_actividad_at as string; return v ? new Date(v) : new Date(p.updated_at); }

function scoreColor(s: number) {
  if (s >= 70) return "var(--cyan)";
  if (s >= 40) return "var(--amber)";
  return "var(--text-3)";
}
function nivBadge(n: string) {
  if (n === "alto") return "badge badge-cyan";
  if (n === "medio") return "badge badge-amber";
  return "badge badge-gray";
}
function estadoBadge(e: string) {
  if (e === "entrega_premium") return "badge badge-green";
  if (e === "calificacion_estrategica") return "badge badge-cyan";
  if (e === "filtro_interes") return "badge badge-amber";
  return "badge badge-gray";
}

function buildInsights(pacs: Paciente[], convs: Conv[]): string[] {
  const insights: string[] = [];
  const srvCount: Record<string, number> = {};
  let altaIntencion = 0; let invisalign = 0;
  pacs.forEach(p => {
    const s = srv(p); if (s) srvCount[s] = (srvCount[s] || 0) + 1;
    if (niv(p) === "alto") altaIntencion++;
    if (s === "ortodoncia") invisalign++;
  });
  const top = Object.entries(srvCount).sort((a,b) => b[1]-a[1])[0];
  if (top) insights.push(`La mayoría de leads hoy consultaron ${SRV[top[0]] ?? top[0]} (${top[1]} consultas).`);
  if (altaIntencion > 0) insights.push(`${altaIntencion} paciente${altaIntencion > 1 ? "s" : ""} con alta intención detectado${altaIntencion > 1 ? "s" : ""} — respuesta urgente recomendada.`);
  if (invisalign >= 2) insights.push(`Tendencia: ${invisalign} leads de ortodoncia invisible activos. Momento óptimo para seguimiento.`);
  const sinRespuesta = pacs.filter(p => { const h = (Date.now() - ua(p).getTime())/3600000; return h > 24 && sc(p) >= 30; });
  if (sinRespuesta.length > 0) insights.push(`${sinRespuesta.length} lead${sinRespuesta.length > 1 ? "s" : ""} con interés alto sin respuesta en más de 24h — programar seguimiento.`);
  const hoy = convs.filter(c => new Date(c.timestamp) > new Date(Date.now() - 86400000));
  if (hoy.length > 5) insights.push(`${hoy.length} mensajes procesados hoy — actividad superior al promedio.`);
  if (insights.length === 0) insights.push("Sistema operando con normalidad. Monitoreo de conversaciones activo.");
  return insights.slice(0, 4);
}

export default function Home() {
  const [pacs, setPacs] = useState<Paciente[]>([]);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [kpis, setKpis] = useState({ total: 0, hoy: 0, convsHoy: 0, listos: 0, calientes: 0 });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [feed, setFeed] = useState<{ msg: string; time: Date; tipo: string }[]>([]);

  const load = useCallback(async () => {
    try {
      const today = new Date(); today.setHours(0,0,0,0);
      const t = today.toISOString();
      const [{ count: total }, { count: hoy }, { count: cHoy }, { data: pacsD }, { data: convsD }] = await Promise.all([
        supabase.from("pacientes").select("*", { count:"exact", head:true }),
        supabase.from("pacientes").select("*", { count:"exact", head:true }).gte("created_at", t),
        supabase.from("conversaciones").select("*", { count:"exact", head:true }).gte("timestamp", t),
        supabase.from("pacientes").select("id,alias,calificado,telefono_encriptado,perfil_paciente,created_at,updated_at").eq("estado","activo").order("updated_at",{ascending:false}).limit(50),
        supabase.from("conversaciones").select("id,paciente_id,direccion,mensaje_encriptado,timestamp,metadata").order("timestamp",{ascending:false}).limit(30),
      ]);
      const d = (pacsD || []) as Paciente[];
      const cv = (convsD || []) as Conv[];
      const listos = d.filter(p => ec(p) === "entrega_premium").length;
      const calientes = d.filter(p => sc(p) >= 60).length;
      setKpis({ total: total??0, hoy: hoy??0, convsHoy: cHoy??0, listos, calientes });
      setPacs(d); setConvs(cv);
      // Build feed
      const feedItems = cv.slice(0,8).map(c => ({
        msg: c.direccion === "entrante" ? "Nuevo mensaje recibido" : "Respuesta del agente enviada",
        time: new Date(c.timestamp),
        tipo: c.direccion === "entrante" ? "entrante" : "saliente",
      }));
      setFeed(feedItems);
      setLastUpdate(new Date());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  // Derived data
  const leadsCalientes = pacs.filter(p => sc(p) >= 50).sort((a,b) => sc(b)-sc(a)).slice(0,6);
  const seguimientos = pacs.filter(p => { const h = (Date.now()-ua(p).getTime())/3600000; return h > 12 && sc(p) >= 20 && ec(p) !== "entrega_premium"; }).slice(0,4);
  const insights = buildInsights(pacs, convs);

  // Funnel
  const funnel = [
    { label: "Conversaciones", value: kpis.total, pct: 100 },
    { label: "Leads calificados", value: pacs.filter(p => sc(p) >= 20).length, pct: kpis.total > 0 ? Math.round(pacs.filter(p=>sc(p)>=20).length/kpis.total*100) : 0 },
    { label: "Alta intención", value: pacs.filter(p => niv(p)==="alto").length, pct: kpis.total > 0 ? Math.round(pacs.filter(p=>niv(p)==="alto").length/kpis.total*100) : 0 },
    { label: "Listos para valorar", value: kpis.listos, pct: kpis.total > 0 ? Math.round(kpis.listos/kpis.total*100) : 0 },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor:"rgba(6,182,212,0.2)", borderTopColor:"var(--cyan)" }} />
        <p className="text-sm" style={{ color:"var(--text-3)" }}>Cargando sistema...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <div className="dm-card-glow p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
          style={{ background:"radial-gradient(circle at top right, rgba(6,182,212,0.08), transparent 70%)" }} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="glow-dot pulse-ring" />
              <span className="text-xs font-semibold tracking-wider" style={{ color:"var(--cyan)" }}>SISTEMA INTELIGENTE ACTIVO</span>
            </div>
            <h1 style={{ fontFamily:"var(--font-cormorant)", fontSize:"1.9rem", fontWeight:500, color:"var(--text)", lineHeight:1.15 }}>
              Sistema de Admisiones<br />
              <span className="gradient-text">con Inteligencia Artificial</span>
            </h1>
            <p className="text-sm mt-2" style={{ color:"var(--text-3)" }}>
              {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })} · Actualizado {format(lastUpdate, "HH:mm:ss")}
            </p>
          </div>
          {/* Live stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "Conversaciones hoy", value: kpis.convsHoy, icon: MessageSquare, color: "var(--cyan)" },
              { label: "Leads prioritarios", value: kpis.calientes, icon: Flame, color: "#F59E0B" },
              { label: "Seguimientos", value: seguimientos.length, icon: Clock, color: "#A78BFA" },
              { label: "Listos para llamar", value: kpis.listos, icon: Phone, color: "var(--green)" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="text-center px-3 py-3 rounded-xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)" }}>
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-[10px] mt-0.5 leading-tight" style={{ color:"var(--text-3)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ GRID PRINCIPAL ════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── COLUMNA IZQUIERDA (2/3) ─────────────────────────────── */}
        <div className="xl:col-span-2 space-y-5">

          {/* LEADS PRIORITARIOS */}
          <div className="dm-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.2)" }}>
                  <Flame className="w-4 h-4" style={{ color:"var(--red)" }} />
                </div>
                <div>
                  <p className="section-label">Alta prioridad</p>
                  <h2 className="text-sm font-bold" style={{ color:"var(--text)" }}>Leads prioritarios</h2>
                </div>
              </div>
              <a href="/citas" className="flex items-center gap-1 text-xs font-medium transition-colors" style={{ color:"var(--cyan)" }}>
                Ver todos <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            {leadsCalientes.length === 0 ? (
              <div className="text-center py-8">
                <Flame className="w-8 h-8 mx-auto mb-2" style={{ color:"var(--text-3)" }} />
                <p className="text-sm" style={{ color:"var(--text-3)" }}>Sin leads calientes en este momento</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {leadsCalientes.map(p => {
                  const score = sc(p); const nivel = niv(p); const servicio = srv(p); const telefono = tel(p);
                  const nombre = nom(p); const act = ua(p);
                  return (
                    <div key={p.id} className="flex items-center gap-3.5 p-3.5 rounded-xl transition-all group"
                      style={{ background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(6,182,212,0.2)"; (e.currentTarget as HTMLElement).style.background = "rgba(6,182,212,0.04)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background:"rgba(6,182,212,0.1)", color:"var(--cyan)", border:"1px solid rgba(6,182,212,0.15)" }}>
                        {nombre.slice(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color:"var(--text)" }}>{nombre}</span>
                          <span className={nivBadge(nivel)}>{nivel === "alto" ? "Alta intención" : nivel === "medio" ? "Media" : "Baja"}</span>
                        </div>
                        <p className="text-xs" style={{ color:"var(--text-2)" }}>
                          {servicio ? (SRV[servicio] ?? servicio) : "Sin servicio"} · {formatDistanceToNow(act, { locale:es, addSuffix:true })}
                        </p>
                        {telefono && <p className="text-[11px] mt-0.5" style={{ color:"var(--text-3)" }}>{telefono}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-black" style={{ color: scoreColor(score) }}>{score}</p>
                        <div className="score-bar w-14 mt-1"><div className="score-bar-fill" style={{ width:`${score}%` }} /></div>
                        <p className="text-[9px] mt-0.5" style={{ color:"var(--text-3)" }}>score IA</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CONVERSACIONES */}
          <div className="dm-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"rgba(6,182,212,0.1)", border:"1px solid rgba(6,182,212,0.15)" }}>
                  <MessageSquare className="w-4 h-4" style={{ color:"var(--cyan)" }} />
                </div>
                <div>
                  <p className="section-label">WhatsApp · CRM · IA</p>
                  <h2 className="text-sm font-bold" style={{ color:"var(--text)" }}>Centro de conversaciones</h2>
                </div>
              </div>
              <span className="badge badge-cyan">{kpis.convsHoy} hoy</span>
            </div>
            <div className="space-y-1">
              {convs.slice(0, 8).map((c, i) => {
                const isEntrante = c.direccion === "entrante";
                const estado = c.metadata?.estado_conv as string;
                return (
                  <div key={c.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors"
                    style={{ animationDelay: `${i*30}ms` }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isEntrante ? "bg-cyan-400" : "bg-gray-600"}`}
                      style={isEntrante ? { boxShadow:"0 0 6px rgba(6,182,212,0.6)" } : {}} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold" style={{ color: isEntrante ? "var(--cyan)" : "var(--text-3)" }}>
                          {isEntrante ? "Paciente" : "Agente IA"}
                        </span>
                        {estado && <span className={estadoBadge(estado)} style={{ fontSize:"9px", padding:"2px 6px" }}>{estado}</span>}
                        <span className="text-[10px] ml-auto" style={{ color:"var(--text-3)" }}>
                          {formatDistanceToNow(new Date(c.timestamp), { locale:es, addSuffix:true })}
                        </span>
                      </div>
                      <p className="text-sm truncate" style={{ color:"var(--text-2)" }}>{c.mensaje_encriptado || "—"}</p>
                    </div>
                  </div>
                );
              })}
              {convs.length === 0 && <p className="text-sm text-center py-8" style={{ color:"var(--text-3)" }}>Sin conversaciones recientes</p>}
            </div>
          </div>

          {/* EMBUDO VISUAL */}
          <div className="dm-card p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.15)" }}>
                <TrendingUp className="w-4 h-4" style={{ color:"#A78BFA" }} />
              </div>
              <div>
                <p className="section-label">Proceso de admisión</p>
                <h2 className="text-sm font-bold" style={{ color:"var(--text)" }}>Embudo de conversión</h2>
              </div>
            </div>
            <div className="space-y-2">
              {funnel.map(({ label, value, pct }, i) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold" style={{ color:"var(--text-3)" }}>{String(i+1).padStart(2,"0")}</span>
                      <span className="text-sm font-medium" style={{ color:"var(--text)" }}>{label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold" style={{ color:"var(--text)" }}>{value}</span>
                      <span className="text-xs" style={{ color:"var(--text-3)" }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background:"rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width:`${pct}%`, background: i===0 ? "rgba(255,255,255,0.25)" : i===1 ? "#A78BFA" : i===2 ? "var(--cyan)" : "var(--green)", boxShadow: i===2 ? "0 0 8px rgba(6,182,212,0.5)" : i===3 ? "0 0 8px rgba(16,185,129,0.5)" : "none" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── COLUMNA DERECHA (1/3) ────────────────────────────────── */}
        <div className="space-y-5">

          {/* ACTIVIDAD EN TIEMPO REAL */}
          <div className="dm-card p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.15)" }}>
                <Activity className="w-4 h-4" style={{ color:"var(--green)" }} />
              </div>
              <div>
                <p className="section-label">En vivo</p>
                <h2 className="text-sm font-bold" style={{ color:"var(--text)" }}>Actividad del sistema</h2>
              </div>
            </div>
            <div className="space-y-2">
              {feed.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color:"var(--text-3)" }}>Sin actividad reciente</p>
              ) : feed.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 animate-slide-in" style={{ animationDelay:`${i*40}ms` }}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${f.tipo === "entrante" ? "bg-emerald-400" : "bg-cyan-500"}`}
                    style={{ boxShadow: f.tipo === "entrante" ? "0 0 6px rgba(52,211,153,0.6)" : "0 0 6px rgba(6,182,212,0.6)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color:"var(--text-2)" }}>{f.msg}</p>
                    <p className="text-[10px] mt-0.5" style={{ color:"var(--text-3)" }}>
                      {formatDistanceToNow(f.time, { locale:es, addSuffix:true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* INSIGHTS IA */}
          <div className="dm-card p-5" style={{ background:"rgba(6,182,212,0.03)", borderColor:"rgba(6,182,212,0.12)" }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"rgba(6,182,212,0.12)", border:"1px solid rgba(6,182,212,0.2)" }}>
                <Brain className="w-4 h-4" style={{ color:"var(--cyan)" }} />
              </div>
              <div>
                <p className="section-label" style={{ color:"rgba(6,182,212,0.5)" }}>Inteligencia artificial</p>
                <h2 className="text-sm font-bold" style={{ color:"var(--text)" }}>Insights IA</h2>
              </div>
            </div>
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color:"var(--cyan)" }} />
                  <p className="text-xs leading-relaxed" style={{ color:"var(--text-2)" }}>{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SEGUIMIENTOS */}
          <div className="dm-card p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.15)" }}>
                <Clock className="w-4 h-4" style={{ color:"var(--amber)" }} />
              </div>
              <div>
                <p className="section-label">Pendientes</p>
                <h2 className="text-sm font-bold" style={{ color:"var(--text)" }}>Seguimientos</h2>
              </div>
            </div>
            {seguimientos.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs" style={{ color:"var(--text-3)" }}>Sin seguimientos pendientes</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {seguimientos.map(p => {
                  const hrs = Math.round((Date.now()-ua(p).getTime())/3600000);
                  const nombre = nom(p); const score = sc(p); const nivel = niv(p);
                  return (
                    <div key={p.id} className="p-3 rounded-xl" style={{ background:"rgba(245,158,11,0.04)", border:"1px solid rgba(245,158,11,0.12)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold truncate" style={{ color:"var(--text)" }}>{nombre}</span>
                        <span className="text-xs font-bold" style={{ color:"var(--amber)" }}>{score}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]" style={{ color:"var(--text-3)" }}>
                        <Clock className="w-3 h-3" />
                        <span>{hrs}h sin responder</span>
                        <span className={nivBadge(nivel)} style={{ fontSize:"9px", padding:"2px 6px" }}>{nivel}</span>
                      </div>
                      {hrs > 24 && (
                        <p className="text-[11px] mt-1.5 font-medium" style={{ color:"var(--amber)" }}>
                          📞 Recomendado: contactar hoy
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* MÉTRICAS CLAVE */}
          <div className="dm-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4" style={{ color:"var(--text-3)" }} />
              <h2 className="text-sm font-bold" style={{ color:"var(--text)" }}>Métricas clave</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "Total pacientes", value: kpis.total },
                { label: "Leads calientes (≥60)", value: kpis.calientes },
                { label: "Alta intención", value: pacs.filter(p=>niv(p)==="alto").length },
                { label: "Listos para llamar", value: kpis.listos },
                { label: "Nuevos hoy", value: kpis.hoy },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color:"var(--text-3)" }}>{label}</span>
                  <span className="text-sm font-bold" style={{ color:"var(--text)" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="text-center py-1">
        <p className="text-xs" style={{ color:"var(--text-3)", fontFamily:"var(--font-cormorant)", fontStyle:"italic" }}>
          Diego Mejía Dental Group · Sistema Privado de Admisiones Inteligentes
        </p>
      </div>
    </div>
  );
}
