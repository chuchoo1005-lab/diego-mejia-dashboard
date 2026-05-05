"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Brain, Flame, Clock, MessageSquare, Users, TrendingUp, ArrowRight, Zap, Activity, Phone, AlertTriangle, Target, ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Paciente {
  id: string; alias: string; calificado: boolean; origen: string;
  telefono_encriptado: string | null;
  perfil_paciente: Record<string, unknown>; created_at: string; updated_at: string;
}
interface Conv {
  id: string; paciente_id: string; direccion: string;
  mensaje_encriptado: string; timestamp: string; metadata: Record<string, unknown>;
}

// ─── Data helpers ─────────────────────────────────────────────────────────────
const SRV: Record<string, string> = { ortodoncia: "Ortodoncia invisible", diseno: "Diseño de sonrisa", general: "Odontología general" };

function tel(p: Paciente): string {
  const t = p.telefono_encriptado; if (!t) return "";
  const c = t.replace(/\D/g, "");
  if (c.length >= 10 && c.startsWith("57")) return `+57 ${c.slice(2,5)} ${c.slice(5,8)} ${c.slice(8)}`;
  return t;
}
function nom(p: Paciente) { return (p.perfil_paciente?.nombre as string) || tel(p) || p.alias; }
function sc(p: Paciente)  { return parseInt(String(p.perfil_paciente?.score ?? "0")) || 0; }
function ec(p: Paciente)  { return (p.perfil_paciente?.estado_conv as string) || "nuevo"; }
function srv(p: Paciente) { return (p.perfil_paciente?.servicio_interes as string) || null; }
function niv(p: Paciente) { return (p.perfil_paciente?.nivel_interes as string) || "bajo"; }
function ua(p: Paciente)  { const v = p.perfil_paciente?.ultima_actividad_at as string; return v ? new Date(v) : new Date(p.updated_at); }
function resumen(p: Paciente) { return (p.perfil_paciente?.resumen_lead as string) || ""; }
function razon(p: Paciente)   { return (p.perfil_paciente?.razon_score as string) || ""; }

// ─── Score badge ─────────────────────────────────────────────────────────────
function scoreBadge(score: number) {
  if (score >= 80) return { emoji: "💎", label: "Premium", cls: "badge-cyan" };
  if (score >= 60) return { emoji: "🔥", label: "Alta intención", cls: "badge-red" };
  if (score >= 30) return { emoji: "🟡", label: "Explorando", cls: "badge-amber" };
  return { emoji: "⚪", label: "Baja intención", cls: "badge-gray" };
}

// ─── Emotional state ──────────────────────────────────────────────────────────
function detectEmocion(p: Paciente) {
  const r = resumen(p).toLowerCase();
  const ini = ((p.perfil_paciente?.intencion_inicio as string) || "").toLowerCase();
  const n = niv(p);
  if (r.includes("urgente") || r.includes("pronto") || ini.includes("pronto") || ini.includes("inmediato"))
    return { emoji: "⚡", label: "Urgencia", color: "var(--red)" };
  if (r.includes("financiaci") || r.includes("precio") || r.includes("costo"))
    return { emoji: "💰", label: "Interés financiero", color: "var(--amber)" };
  if (r.includes("miedo") || r.includes("nervios") || r.includes("insegur") || r.includes("miedo al dolor"))
    return { emoji: "😟", label: "Inseguridad", color: "var(--text-3)" };
  if (r.includes("comparando") || r.includes("otra clínica") || r.includes("otras opciones"))
    return { emoji: "🔍", label: "Comparando", color: "var(--text-2)" };
  if (n === "alto")
    return { emoji: "🎯", label: "Decisión", color: "var(--green)" };
  if (r.includes("evento") || r.includes("boda") || r.includes("graduaci"))
    return { emoji: "📅", label: "Evento próximo", color: "var(--cyan)" };
  return null;
}

// ─── Close probability ────────────────────────────────────────────────────────
function cierrePct(p: Paciente): number {
  let prob = sc(p);
  if (p.perfil_paciente?.nombre) prob += 5;
  if (p.perfil_paciente?.ciudad) prob += 5;
  if (p.perfil_paciente?.horario_contacto) prob += 10;
  if (ec(p) === "entrega_premium") prob += 20;
  if (niv(p) === "alto") prob += 10;
  return Math.min(95, Math.max(0, prob));
}

// ─── AI Recommendation ────────────────────────────────────────────────────────
function iaRecomendacion(p: Paciente): string {
  const cierre = cierrePct(p);
  const hrs = (Date.now() - ua(p).getTime()) / 3600000;
  const ec_ = ec(p);
  if (ec_ === "entrega_premium") return "Datos completos. Contactar para agendar valoración.";
  if (cierre >= 80) return "Alta probabilidad de cierre. Contactar antes de 30 minutos.";
  if (hrs > 48 && cierre >= 50) return `Sin respuesta ${Math.round(hrs)}h. Enviar seguimiento hoy.`;
  if (niv(p) === "alto") return "Lead caliente. Proponer valoración directamente.";
  const r = resumen(p).toLowerCase();
  if (r.includes("financiaci")) return "Interés en financiación. Mencionar opciones de pago.";
  if (r.includes("miedo") || r.includes("dolor")) return "Inseguridad detectada. Enviar video de comodidad.";
  return "Continuar conversación. Hacer preguntas de calificación.";
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function buildTimeline(p: Paciente): { icon: string; msg: string }[] {
  const tl: { icon: string; msg: string }[] = [];
  const perf = p.perfil_paciente;
  tl.push({ icon: "🟢", msg: `Llegó desde ${p.origen || "WhatsApp"}` });
  const s = srv(p);
  if (s) tl.push({ icon: "🟢", msg: `Consultó ${SRV[s] ?? s}` });
  const videos = (perf?.videos_enviados as string[]) || [];
  if (videos.length > 0) tl.push({ icon: "🟢", msg: `${videos.length} video${videos.length > 1 ? "s" : ""} enviado${videos.length > 1 ? "s" : ""}` });
  const r = resumen(p).toLowerCase();
  if (r.includes("financiaci")) tl.push({ icon: "🟢", msg: "Consultó financiación" });
  if (r.includes("ciudad") || perf?.ciudad) tl.push({ icon: "🟢", msg: `Ciudad: ${perf?.ciudad || "capturada"}` });
  const segs = parseInt(String(perf?.seguimientos_enviados ?? "0")) || 0;
  if (segs > 0) tl.push({ icon: "📤", msg: `${segs} seguimiento${segs > 1 ? "s" : ""} enviado${segs > 1 ? "s" : ""}` });
  if (ec(p) === "entrega_premium") tl.push({ icon: "✅", msg: "Listo para valoración" });
  return tl.slice(-4);
}

// ─── Insights ────────────────────────────────────────────────────────────────
function buildInsights(pacs: Paciente[]): { icon: string; text: string; tipo: string }[] {
  const ins: { icon: string; text: string; tipo: string }[] = [];
  const srvCnt: Record<string, number> = {};
  let altaIntencion = 0; let premium = 0;
  pacs.forEach(p => {
    const s = srv(p); if (s) srvCnt[s] = (srvCnt[s] || 0) + 1;
    if (niv(p) === "alto") altaIntencion++;
    if (sc(p) >= 80) premium++;
  });
  const top = Object.entries(srvCnt).sort((a,b) => b[1]-a[1])[0];
  if (top) ins.push({ icon: "📊", text: `El tratamiento más consultado es ${SRV[top[0]] ?? top[0]} (${top[1]} leads).`, tipo: "tendencia" });
  if (altaIntencion > 0) ins.push({ icon: "🎯", text: `${altaIntencion} lead${altaIntencion > 1 ? "s" : ""} con alta intención detectado${altaIntencion > 1 ? "s" : ""}. Respuesta urgente recomendada.`, tipo: "urgente" });
  if (premium > 0) ins.push({ icon: "💎", text: `${premium} lead${premium > 1 ? "s" : ""} premium con probabilidad alta de cierre.`, tipo: "oportunidad" });
  const sinResp = pacs.filter(p => (Date.now()-ua(p).getTime())/3600000 > 24 && sc(p) >= 30);
  if (sinResp.length > 0) ins.push({ icon: "⏰", text: `${sinResp.length} lead${sinResp.length > 1 ? "s" : ""} con interés alto sin respuesta en más de 24h.`, tipo: "alerta" });
  if (ins.length === 0) ins.push({ icon: "✅", text: "Sistema operando correctamente. Sin alertas urgentes.", tipo: "ok" });
  return ins;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const [pacs, setPacs] = useState<Paciente[]>([]);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [kpis, setKpis] = useState({ total: 0, hoy: 0, convsHoy: 0, listos: 0, calientes: 0 });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [feedItems, setFeedItems] = useState<{ msg: string; time: Date; tipo: string }[]>([]);

  const load = useCallback(async () => {
    try {
      const today = new Date(); today.setHours(0,0,0,0);
      const t = today.toISOString();
      const [{ count: total }, { count: hoy }, { data: convsHoyData }, { data: pacsD }, { data: convsD }] = await Promise.all([
        supabase.from("pacientes").select("*", { count:"exact", head:true }),
        supabase.from("pacientes").select("*", { count:"exact", head:true }).gte("created_at", t),
        supabase.from("conversaciones").select("paciente_id").gte("timestamp", t),
        supabase.from("pacientes").select("id,alias,calificado,origen,telefono_encriptado,perfil_paciente,created_at,updated_at").eq("estado","activo").order("updated_at",{ascending:false}).limit(50),
        supabase.from("conversaciones").select("id,paciente_id,direccion,mensaje_encriptado,timestamp,metadata").order("timestamp",{ascending:false}).limit(30),
      ]);
      const d = (pacsD || []) as Paciente[];
      const cv = (convsD || []) as Conv[];
      // Contar chats únicos (pacientes distintos), no mensajes individuales
      const chatsUnicos = new Set((convsHoyData || []).map((c: {paciente_id: string}) => c.paciente_id)).size;
      setKpis({ total:total??0, hoy:hoy??0, convsHoy:chatsUnicos, listos:d.filter(p=>ec(p)==="entrega_premium").length, calientes:d.filter(p=>sc(p)>=60).length });
      setPacs(d); setConvs(cv);
      setFeedItems(cv.slice(0,10).map(c => {
        const msg = c.direccion === "entrante"
          ? (c.mensaje_encriptado?.length > 40 ? c.mensaje_encriptado.slice(0,40) + "..." : c.mensaje_encriptado) || "Nuevo mensaje"
          : "Respuesta del agente IA enviada";
        return { msg, time: new Date(c.timestamp), tipo: c.direccion };
      }));
      setLastUpdate(new Date());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const toggleExpanded = (id: string) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const leadsTop = pacs.filter(p => sc(p) >= 40).sort((a,b) => sc(b)-sc(a)).slice(0,6);
  const seguimientos = pacs.filter(p => { const h=(Date.now()-ua(p).getTime())/3600000; return h>12 && sc(p)>=20 && ec(p)!=="entrega_premium"; }).sort((a,b) => sc(b)-sc(a)).slice(0,4);
  const alertasUrgentes = pacs.filter(p => { const h=(Date.now()-ua(p).getTime())/3600000; return (ec(p)==="entrega_premium" || (h>6 && sc(p)>=60)); }).slice(0,3);
  const insights = buildInsights(pacs);
  const funnel = [
    { label: "Conversaciones totales", value: kpis.total, color: "rgba(255,255,255,0.2)" },
    { label: "Leads calificados (≥20)", value: pacs.filter(p=>sc(p)>=20).length, color: "var(--cyan)" },
    { label: "Alta intención",          value: pacs.filter(p=>niv(p)==="alto").length, color: "var(--amber)" },
    { label: "Listos para valorar",     value: kpis.listos, color: "var(--green)" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor:"rgba(6,182,212,0.2)", borderTopColor:"var(--cyan)" }} />
        <p className="text-xs tracking-widest uppercase" style={{ color:"var(--text-3)" }}>Inicializando sistema IA...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ══ ALERTAS URGENTES ══════════════════════════════════════════ */}
      {alertasUrgentes.length > 0 && (
        <div className="space-y-2">
          {alertasUrgentes.map(p => {
            const hrs = Math.round((Date.now()-ua(p).getTime())/3600000);
            const telefono = tel(p); const nombre = nom(p);
            const isListo = ec(p) === "entrega_premium";
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl animate-fade-up"
                style={{ background: isListo ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.05)", border:`1px solid ${isListo ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.15)"}` }}>
                <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: isListo ? "var(--green)" : "var(--red)" }} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold" style={{ color:"var(--text)" }}>{nombre}</span>
                  <span className="text-xs ml-2" style={{ color:"var(--text-3)" }}>
                    {isListo ? "Listo para valoración — esperando llamada" : `${hrs}h sin respuesta · Score ${sc(p)}`}
                  </span>
                </div>
                {telefono && (
                  <a href={`tel:${p.telefono_encriptado}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all"
                    style={{ background:"var(--green)", color:"#000" }}>
                    <Phone className="w-3 h-3" /> Llamar ahora
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <div className="dm-card-glow p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 pointer-events-none" style={{ background:"radial-gradient(circle at top right, rgba(6,182,212,0.07), transparent 70%)" }} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="glow-dot pulse-ring" />
              <span className="text-xs font-bold tracking-[0.2em]" style={{ color:"var(--cyan)" }}>SISTEMA INTELIGENTE ACTIVO</span>
            </div>
            <h1 style={{ fontFamily:"var(--font-cormorant)", fontSize:"1.85rem", fontWeight:500, color:"var(--text)", lineHeight:1.15 }}>
              Centro de Admisiones<br /><span className="gradient-text">con Inteligencia Artificial</span>
            </h1>
            <p className="text-xs mt-2" style={{ color:"var(--text-3)" }}>
              {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale:es })} · {format(lastUpdate, "HH:mm:ss")}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:"Mensajes hoy",  value:kpis.convsHoy, icon:MessageSquare, color:"var(--cyan)" },
              { label:"Leads 🔥",      value:kpis.calientes, icon:Flame,  color:"#F97316" },
              { label:"Seguimientos",  value:seguimientos.length, icon:Clock, color:"#A78BFA" },
              { label:"Para llamar",   value:kpis.listos, icon:Phone, color:"var(--green)" },
            ].map(({ label, value, icon:Icon, color }) => (
              <div key={label} className="text-center px-3 py-3 rounded-xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)" }}>
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                <p className="text-2xl font-black" style={{ color }}>{value}</p>
                <p className="text-[10px] leading-tight" style={{ color:"var(--text-3)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ GRID PRINCIPAL ════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── COLUMNA IZQUIERDA ─────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-5">

          {/* LEADS PRIORITARIOS — CARDS EXPANDIBLES */}
          <div className="dm-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.2)" }}>
                  <Flame className="w-4 h-4" style={{ color:"var(--red)" }} />
                </div>
                <div>
                  <p className="section-label">Score IA · Alta prioridad</p>
                  <h2 className="text-sm font-bold" style={{ color:"var(--text)" }}>Leads prioritarios</h2>
                </div>
              </div>
              <a href="/citas" className="flex items-center gap-1 text-xs font-medium" style={{ color:"var(--cyan)" }}>Ver todos <ArrowRight className="w-3 h-3" /></a>
            </div>

            {leadsTop.length === 0 ? (
              <div className="text-center py-10">
                <Target className="w-8 h-8 mx-auto mb-2" style={{ color:"var(--text-3)" }} />
                <p className="text-sm" style={{ color:"var(--text-3)" }}>Sin leads prioritarios. Activa el agente conversacional.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leadsTop.map(p => {
                  const score = sc(p); const badge = scoreBadge(score); const emocion = detectEmocion(p);
                  const telefono = tel(p); const nombre = nom(p); const servicio = srv(p);
                  const ciudad = p.perfil_paciente?.ciudad as string; const horario = p.perfil_paciente?.horario_contacto as string;
                  const cierre = cierrePct(p); const rec = iaRecomendacion(p);
                  const sumario = resumen(p); const razonScore = razon(p);
                  const timeline = buildTimeline(p); const isExp = expanded.has(p.id);

                  return (
                    <div key={p.id} className="rounded-xl overflow-hidden transition-all duration-200"
                      style={{ border:"1px solid var(--border)", background:"rgba(255,255,255,0.025)" }}>
                      {/* Card header */}
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-black"
                          style={{ background:"rgba(6,182,212,0.1)", color:"var(--cyan)", border:"1px solid rgba(6,182,212,0.15)" }}>
                          {nombre.slice(0,2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-sm" style={{ color:"var(--text)" }}>{nombre}</span>
                            <span className={`badge ${badge.cls}`}>{badge.emoji} {badge.label}</span>
                            {emocion && <span className="text-[11px] font-medium" style={{ color:emocion.color }}>{emocion.emoji} {emocion.label}</span>}
                          </div>
                          <div className="flex items-center gap-3 text-xs" style={{ color:"var(--text-3)" }}>
                            {servicio && <span>{SRV[servicio] ?? servicio}</span>}
                            {ciudad && <span>· {ciudad}</span>}
                            {telefono && <span>· {telefono}</span>}
                          </div>
                        </div>
                        {/* Score */}
                        <div className="text-right shrink-0 mr-2">
                          <p className="text-xl font-black" style={{ color: score >= 60 ? "var(--cyan)" : score >= 30 ? "var(--amber)" : "var(--text-3)" }}>{score}</p>
                          <div className="score-bar w-16 mt-1"><div className="score-bar-fill" style={{ width:`${score}%` }} /></div>
                          <p className="text-[9px] mt-0.5" style={{ color:"var(--text-3)" }}>score IA</p>
                        </div>
                        {/* Actions */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                          {telefono && (
                            <a href={`tel:${p.telefono_encriptado}`} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                              style={{ background:"var(--green)", color:"#000" }}>
                              <Phone className="w-3 h-3" /> Llamar
                            </a>
                          )}
                          <button onClick={() => toggleExpanded(p.id)} className="flex items-center justify-center px-2.5 py-1.5 rounded-lg text-[11px] transition-all"
                            style={{ background:"rgba(255,255,255,0.05)", color:"var(--text-2)", border:"1px solid var(--border)" }}>
                            {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded profile */}
                      {isExp && (
                        <div className="px-4 pb-4 space-y-3" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                          {/* IA Resumen */}
                          {sumario && (
                            <div className="p-3 rounded-lg" style={{ background:"rgba(6,182,212,0.05)", border:"1px solid rgba(6,182,212,0.12)" }}>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Brain className="w-3.5 h-3.5" style={{ color:"var(--cyan)" }} />
                                <span className="section-label" style={{ color:"rgba(6,182,212,0.6)" }}>Resumen IA</span>
                              </div>
                              <p className="text-xs leading-relaxed" style={{ color:"var(--text-2)" }}>{sumario}</p>
                            </div>
                          )}

                          {/* Recomendación IA */}
                          <div className="p-3 rounded-lg" style={{ background:"rgba(245,158,11,0.05)", border:"1px solid rgba(245,158,11,0.12)" }}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Zap className="w-3.5 h-3.5" style={{ color:"var(--amber)" }} />
                              <span className="section-label" style={{ color:"rgba(245,158,11,0.6)" }}>Recomendación IA</span>
                            </div>
                            <p className="text-xs font-medium" style={{ color:"var(--amber)" }}>{rec}</p>
                            {razonScore && <p className="text-[11px] mt-1" style={{ color:"var(--text-3)" }}>Razón score: {razonScore}</p>}
                          </div>

                          {/* Datos + Probabilidad */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 rounded-lg" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)" }}>
                              <p className="section-label mb-2">Datos capturados</p>
                              <div className="space-y-1 text-xs" style={{ color:"var(--text-2)" }}>
                                {ciudad   && <p>📍 {ciudad}</p>}
                                {horario  && <p>⏰ {horario}</p>}
                                {telefono && <p>📱 {telefono}</p>}
                                {!ciudad && !horario && <p style={{ color:"var(--text-3)" }}>En proceso de captura</p>}
                              </div>
                            </div>
                            <div className="p-3 rounded-lg" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)" }}>
                              <p className="section-label mb-2">Probabilidad de cierre</p>
                              <p className="text-2xl font-black mb-1" style={{ color: cierre >= 70 ? "var(--green)" : cierre >= 40 ? "var(--amber)" : "var(--text-3)" }}>
                                {cierre}%
                              </p>
                              <div className="score-bar"><div className="score-bar-fill" style={{ width:`${cierre}%`, background: cierre >= 70 ? "var(--green)" : "var(--amber)" }} /></div>
                            </div>
                          </div>

                          {/* Timeline */}
                          {timeline.length > 0 && (
                            <div className="p-3 rounded-lg" style={{ background:"rgba(255,255,255,0.02)", border:"1px solid var(--border)" }}>
                              <p className="section-label mb-2">Timeline del lead</p>
                              <div className="space-y-1.5">
                                {timeline.map((ev, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs" style={{ color:"var(--text-2)" }}>
                                    <span>{ev.icon}</span>
                                    <span>{ev.msg}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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
                  <h2 className="text-sm font-bold" style={{ color:"var(--text)" }}>Conversaciones recientes</h2>
                </div>
              </div>
              <span className="badge badge-cyan">{kpis.convsHoy} hoy</span>
            </div>
            <div className="space-y-1">
              {convs.slice(0, 8).map((c, i) => {
                const isEnt = c.direccion === "entrante";
                const estado = c.metadata?.estado_conv as string;
                return (
                  <div key={c.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-default"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isEnt ? "bg-cyan-400" : "bg-gray-600"}`}
                      style={isEnt ? { boxShadow:"0 0 6px rgba(6,182,212,0.6)" } : {}} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold" style={{ color:isEnt ? "var(--cyan)" : "var(--text-3)" }}>
                          {isEnt ? "Paciente" : "Agente IA"}
                        </span>
                        {estado && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background:"rgba(255,255,255,0.06)", color:"var(--text-3)" }}>
                            {estado}
                          </span>
                        )}
                        <span className="text-[10px] ml-auto" style={{ color:"var(--text-3)" }}>
                          {formatDistanceToNow(new Date(c.timestamp), { locale:es, addSuffix:true })}
                        </span>
                      </div>
                      <p className="text-sm truncate" style={{ color:"var(--text-2)" }}>{c.mensaje_encriptado || "—"}</p>
                    </div>
                  </div>
                );
              })}
              {convs.length === 0 && <p className="text-sm text-center py-8" style={{ color:"var(--text-3)" }}>Sin conversaciones registradas</p>}
            </div>
          </div>

          {/* EMBUDO */}
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
            <div className="space-y-3">
              {funnel.map(({ label, value, color }, i) => {
                const pct = funnel[0].value > 0 ? Math.round(value/funnel[0].value*100) : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black" style={{ color:"var(--text-3)" }}>0{i+1}</span>
                        <span className="text-sm font-medium" style={{ color:"var(--text)" }}>{label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold" style={{ color:"var(--text)" }}>{value}</span>
                        <span className="text-xs" style={{ color:"var(--text-3)" }}>{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background:"rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width:`${pct}%`, background:color, boxShadow:i>1 ? `0 0 8px ${color}60` : "none" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── COLUMNA DERECHA ───────────────────────────────────────── */}
        <div className="space-y-5">

          {/* FEED EN VIVO */}
          <div className="dm-card p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.15)" }}>
                <Activity className="w-4 h-4" style={{ color:"var(--green)" }} />
              </div>
              <div className="flex-1">
                <p className="section-label">En tiempo real</p>
                <h2 className="text-sm font-bold" style={{ color:"var(--text)" }}>Actividad del sistema</h2>
              </div>
              <div className="glow-dot pulse-ring" />
            </div>
            <div className="space-y-2.5">
              {feedItems.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color:"var(--text-3)" }}>Sin actividad reciente</p>
              ) : feedItems.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 animate-slide-in" style={{ animationDelay:`${i*30}ms` }}>
                  <div className={`w-2 h-2 rounded-full mt-1 shrink-0`}
                    style={{ background:f.tipo==="entrante"?"var(--green)":"var(--cyan)", boxShadow:`0 0 6px ${f.tipo==="entrante"?"rgba(16,185,129,0.6)":"rgba(6,182,212,0.6)"}` }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs" style={{ color:"var(--text-2)" }}>{f.msg}</p>
                    <p className="text-[10px] mt-0.5" style={{ color:"var(--text-3)" }}>
                      {formatDistanceToNow(f.time, { locale:es, addSuffix:true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* INSIGHTS + RECOMENDACIONES IA */}
          <div className="p-5 rounded-2xl" style={{ background:"rgba(6,182,212,0.03)", border:"1px solid rgba(6,182,212,0.12)" }}>
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
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-base shrink-0">{ins.icon}</span>
                  <div>
                    <p className="text-xs leading-relaxed" style={{ color:"var(--text-2)" }}>{ins.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SEGUIMIENTOS PREMIUM */}
          <div className="dm-card p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.15)" }}>
                <Clock className="w-4 h-4" style={{ color:"var(--amber)" }} />
              </div>
              <div>
                <p className="section-label">Pendientes de acción</p>
                <h2 className="text-sm font-bold" style={{ color:"var(--text)" }}>Seguimientos</h2>
              </div>
            </div>
            {seguimientos.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs" style={{ color:"var(--text-3)" }}>Sin seguimientos pendientes ✓</p>
              </div>
            ) : (
              <div className="space-y-3">
                {seguimientos.map(p => {
                  const hrs = Math.round((Date.now()-ua(p).getTime())/3600000);
                  const nombre = nom(p); const score = sc(p); const telefono = tel(p);
                  const cierre = cierrePct(p); const rec = iaRecomendacion(p);
                  const emocion = detectEmocion(p);
                  return (
                    <div key={p.id} className="p-3.5 rounded-xl" style={{ background:"rgba(245,158,11,0.04)", border:"1px solid rgba(245,158,11,0.12)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm" style={{ color:"var(--text)" }}>{nombre}</span>
                        <span className="text-xs font-black" style={{ color: score>=60 ? "var(--cyan)" : "var(--amber)" }}>{score} pts</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="badge badge-amber"><Clock className="w-2.5 h-2.5" /> {hrs}h sin responder</span>
                        {emocion && <span className="text-[11px]" style={{ color:emocion.color }}>{emocion.emoji} {emocion.label}</span>}
                      </div>
                      <p className="text-[11px] mb-2.5" style={{ color:"var(--amber)" }}>🧠 {rec}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px]" style={{ color:"var(--text-3)" }}>Prob. cierre</p>
                          <p className="text-sm font-bold" style={{ color: cierre>=70 ? "var(--green)" : "var(--amber)" }}>{cierre}%</p>
                        </div>
                        {telefono && (
                          <a href={`tel:${p.telefono_encriptado}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{ background:"var(--amber)", color:"#000" }}>
                            <Phone className="w-3 h-3" /> Llamar
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* MÉTRICAS ESTRATÉGICAS */}
          <div className="dm-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4" style={{ color:"var(--text-3)" }} />
              <h2 className="text-sm font-bold" style={{ color:"var(--text)" }}>Métricas estratégicas</h2>
            </div>
            <div className="space-y-3">
              {[
                { label:"Total pacientes",          value:kpis.total },
                { label:"Leads calientes (≥60)",     value:kpis.calientes },
                { label:"Alta intención",            value:pacs.filter(p=>niv(p)==="alto").length },
                { label:"Invisalign / Ortodoncia",   value:pacs.filter(p=>srv(p)==="ortodoncia").length },
                { label:"Diseño de sonrisa",         value:pacs.filter(p=>srv(p)==="diseno").length },
                { label:"Listos para llamar",        value:kpis.listos },
                { label:"Nuevos hoy",                value:kpis.hoy },
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
          Diego Mejía Dental Group · Sistema Privado de Admisiones con IA
        </p>
      </div>
    </div>
  );
}
