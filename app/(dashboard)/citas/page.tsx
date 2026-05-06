"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Phone, Search, RefreshCw, Clock, MapPin, Stethoscope, Brain, PauseCircle, PlayCircle, FileText, ChevronDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Paciente {
  id: string; alias: string; calificado: boolean;
  telefono_encriptado: string | null;
  perfil_paciente: Record<string, unknown>; updated_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SRV: Record<string, string> = { ortodoncia: "Ortodoncia invisible", diseno: "Diseño de sonrisa", general: "Odontología general" };

const RESULTADOS = [
  { value: "",                   label: "— Sin resultado —",       color: "var(--text-3)" },
  { value: "interesado",         label: "✅ Interesado",            color: "var(--green)" },
  { value: "valoracion_agendada",label: "📅 Valoración agendada",  color: "var(--cyan)" },
  { value: "seguimiento",        label: "🔄 En seguimiento",       color: "var(--amber)" },
  { value: "no_respondio",       label: "📵 No respondió",         color: "var(--text-3)" },
  { value: "no_interesado",      label: "❌ No interesado",        color: "var(--red)" },
  { value: "paciente_activo",    label: "🦷 Paciente activo",      color: "var(--cyan)" },
  { value: "tratamiento_iniciado",label:"💎 Tratamiento iniciado", color: "var(--green)" },
  { value: "cerrado",            label: "🏆 Cerrado",              color: "var(--green)" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTel(t: string | null): string {
  if (!t) return "";
  const c = t.replace(/\D/g, "");
  if (c.length >= 10 && c.startsWith("57")) return `+57 ${c.slice(2,5)} ${c.slice(5,8)} ${c.slice(8)}`;
  return t;
}
function displayName(p: Paciente): string {
  return (p.perfil_paciente?.nombre as string) || formatTel(p.telefono_encriptado) || p.alias;
}
function sc(p: Paciente) { return parseInt(String(p.perfil_paciente?.score ?? "0")) || 0; }
function ec(p: Paciente) { return (p.perfil_paciente?.estado_conv as string) || "nuevo"; }
function ua(p: Paciente) { const v = p.perfil_paciente?.ultima_actividad_at as string; return v ? new Date(v) : new Date(p.updated_at); }
function modoHumano(p: Paciente): boolean { return !!(p.perfil_paciente?.modo_humano); }
function resultadoLlamada(p: Paciente): string { return (p.perfil_paciente?.resultado_llamada as string) || ""; }
function notasInternas(p: Paciente): string { return (p.perfil_paciente?.notas_internas as string) || ""; }

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CitasPage() {
  const [leads, setLeads] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [notasTemp, setNotasTemp] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("pacientes")
      .select("id,alias,calificado,telefono_encriptado,perfil_paciente,updated_at")
      .eq("estado", "activo").order("updated_at", { ascending: false }).limit(100);
    setLeads((data || []) as Paciente[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  // ─── Update helpers ──────────────────────────────────────────────────────────
  const updatePerfil = async (id: string, updates: Record<string, unknown>) => {
    setSaving(id);
    const pac = leads.find(p => p.id === id);
    if (!pac) return;
    const newPerfil = { ...(pac.perfil_paciente || {}), ...updates };
    await supabase.from("pacientes").update({ perfil_paciente: newPerfil }).eq("id", id);
    setLeads(prev => prev.map(p => p.id === id ? { ...p, perfil_paciente: newPerfil } : p));
    setSaving(null);
  };

  const toggleHumano = (p: Paciente) => {
    const nuevoEstado = !modoHumano(p);
    updatePerfil(p.id, {
      modo_humano: nuevoEstado,
      modo_humano_at: nuevoEstado ? new Date().toISOString() : null,
    });
  };

  const setResultado = (p: Paciente, valor: string) => {
    updatePerfil(p.id, { resultado_llamada: valor, resultado_at: new Date().toISOString() });
  };

  const guardarNotas = (p: Paciente) => {
    const nota = notasTemp[p.id] ?? notasInternas(p);
    updatePerfil(p.id, { notas_internas: nota });
  };

  // ─── Filters ─────────────────────────────────────────────────────────────────
  const filtrados = leads.filter(p => {
    const nom = displayName(p); const tel = formatTel(p.telefono_encriptado);
    const match = !busqueda || nom.toLowerCase().includes(busqueda.toLowerCase()) || tel.includes(busqueda);
    const score = sc(p); const estado = ec(p); const res = resultadoLlamada(p);
    const f = filtro === "todos" ? true
      : filtro === "listos" ? estado === "entrega_premium"
      : filtro === "calientes" ? score >= 60
      : filtro === "calificados" ? p.calificado
      : filtro === "pausados" ? modoHumano(p)
      : filtro === "con_resultado" ? !!res
      : true;
    return match && f;
  });

  const stats = {
    listos: leads.filter(p => ec(p) === "entrega_premium").length,
    calientes: leads.filter(p => sc(p) >= 60).length,
    pausados: leads.filter(p => modoHumano(p)).length,
    agendados: leads.filter(p => resultadoLlamada(p) === "valoracion_agendada").length,
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Centro operativo</p>
          <h1 style={{ fontFamily:"var(--font-cormorant)", fontSize:"2rem", fontWeight:500, color:"var(--text)" }}>
            Leads para llamar
          </h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-3)" }}>Gestión de pacientes · Resultado de llamada · Modo humano</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
          style={{ background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", color:"var(--text-2)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:"Listos para llamar", value:stats.listos,    color:"var(--green)" },
          { label:"Leads calientes",    value:stats.calientes, color:"var(--cyan)" },
          { label:"IA pausada",         value:stats.pausados,  color:"var(--amber)" },
          { label:"Valoración agendada",value:stats.agendados, color:"#A78BFA" },
        ].map(({ label, value, color }) => (
          <div key={label} className="dm-card p-4">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-1" style={{ color:"var(--text-3)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Búsqueda + Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:"var(--text-3)" }} />
          <input type="text" placeholder="Buscar por nombre o teléfono..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
            style={{ background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", color:"var(--text)" }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key:"todos",         label:"Todos" },
            { key:"listos",        label:"Listos" },
            { key:"calientes",     label:"Calientes" },
            { key:"pausados",      label:"IA pausada" },
            { key:"con_resultado", label:"Con resultado" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltro(key)}
              className="px-3.5 py-2 text-sm font-medium rounded-xl transition-all"
              style={{ background:filtro===key?"rgba(6,182,212,0.12)":"rgba(255,255,255,0.04)", color:filtro===key?"var(--cyan)":"var(--text-3)", border:"1px solid", borderColor:filtro===key?"rgba(6,182,212,0.3)":"var(--border)" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor:"rgba(6,182,212,0.2)", borderTopColor:"var(--cyan)" }} />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="dm-card p-14 text-center">
          <Phone className="w-10 h-10 mx-auto mb-3" style={{ color:"var(--text-3)" }} />
          <p className="font-medium" style={{ color:"var(--text-2)" }}>No hay leads en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(p => {
            const score = sc(p); const estado = ec(p); const act = ua(p);
            const nombre = displayName(p); const telefono = formatTel(p.telefono_encriptado);
            const rawNombre = p.perfil_paciente?.nombre as string;
            const ciudad = p.perfil_paciente?.ciudad as string;
            const horario = p.perfil_paciente?.horario_contacto as string;
            const servicio = p.perfil_paciente?.servicio_interes as string;
            const resumen = p.perfil_paciente?.resumen_lead as string;
            const isListo = estado === "entrega_premium";
            const isPausado = modoHumano(p);
            const resultado = resultadoLlamada(p);
            const notas = notasInternas(p);
            const isExp = expanded.has(p.id);
            const resultadoCfg = RESULTADOS.find(r => r.value === resultado);
            const isSaving = saving === p.id;

            return (
              <div key={p.id} className="dm-card overflow-hidden" style={isPausado ? { borderColor:"rgba(245,158,11,0.25)" } : isListo ? { borderColor:"rgba(16,185,129,0.2)" } : {}}>

                {/* ── Card header ── */}
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-black"
                    style={{ background:isPausado?"rgba(245,158,11,0.1)":"rgba(6,182,212,0.1)", color:isPausado?"var(--amber)":"var(--cyan)", border:`1px solid ${isPausado?"rgba(245,158,11,0.2)":"rgba(6,182,212,0.15)"}` }}>
                    {nombre.slice(0,2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-bold text-sm" style={{ color:"var(--text)" }}>{rawNombre || nombre}</span>
                      {isPausado && <span className="badge badge-amber"><PauseCircle className="w-2.5 h-2.5" /> IA pausada</span>}
                      {isListo && !isPausado && <span className="badge badge-green">✓ Listo para llamar</span>}
                      {resultado && <span className="text-[11px] font-medium" style={{ color:resultadoCfg?.color ?? "var(--text-3)" }}>{resultadoCfg?.label}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs" style={{ color:"var(--text-3)" }}>
                      {telefono && <span>{telefono}</span>}
                      {ciudad && <><span>·</span><span>{ciudad}</span></>}
                      {servicio && <><span>·</span><span>{SRV[servicio] ?? servicio}</span></>}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0 mx-2">
                    <p className="text-lg font-black" style={{ color:score>=60?"var(--cyan)":score>=30?"var(--amber)":"var(--text-3)" }}>{score}</p>
                    <p className="text-[9px]" style={{ color:"var(--text-3)" }}>score</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {telefono && (
                      <a href={`tel:${p.telefono_encriptado}`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
                        style={{ background:"var(--green)", color:"#000" }}>
                        <Phone className="w-3 h-3" /> Llamar
                      </a>
                    )}
                    <button onClick={() => setExpanded(prev => { const s=new Set(prev); s.has(p.id)?s.delete(p.id):s.add(p.id); return s; })}
                      className="flex items-center justify-center px-2.5 py-1.5 rounded-lg text-[11px] gap-1"
                      style={{ background:"rgba(255,255,255,0.05)", color:"var(--text-2)", border:"1px solid var(--border)" }}>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExp?"rotate-180":""}`} />
                    </button>
                  </div>
                </div>

                {/* ── Expanded panel ── */}
                {isExp && (
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>

                    {/* Resultado de llamada */}
                    <div>
                      <p className="section-label mb-2">Resultado de la llamada</p>
                      <div className="flex flex-wrap gap-2">
                        {RESULTADOS.filter(r => r.value !== "").map(r => (
                          <button key={r.value} onClick={() => setResultado(p, r.value)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{
                              background: resultado===r.value ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                              color: resultado===r.value ? "#FFF" : "var(--text-3)",
                              border:`1px solid ${resultado===r.value?"rgba(255,255,255,0.2)":"var(--border)"}`,
                              opacity: isSaving ? 0.6 : 1,
                            }}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Modo humano */}
                    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)" }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color:"var(--text)" }}>
                          {isPausado ? "🟡 IA pausada — atención manual activa" : "🟢 IA activa — respondiendo automáticamente"}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color:"var(--text-3)" }}>
                          {isPausado ? "El agente no responde a este paciente. Tú estás atendiendo." : "El agente responde automáticamente. Pausar si vas a atender manualmente."}
                        </p>
                      </div>
                      <button onClick={() => toggleHumano(p)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ml-4 shrink-0 transition-all"
                        style={{ background:isPausado?"rgba(16,185,129,0.12)":"rgba(245,158,11,0.12)", color:isPausado?"var(--green)":"var(--amber)", border:`1px solid ${isPausado?"rgba(16,185,129,0.2)":"rgba(245,158,11,0.2)"}` }}>
                        {isPausado ? <><PlayCircle className="w-4 h-4" /> Reactivar IA</> : <><PauseCircle className="w-4 h-4" /> Pausar IA</>}
                      </button>
                    </div>

                    {/* Resumen IA */}
                    {resumen && (
                      <div className="p-3 rounded-xl" style={{ background:"rgba(6,182,212,0.04)", border:"1px solid rgba(6,182,212,0.12)" }}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Brain className="w-3.5 h-3.5" style={{ color:"var(--cyan)" }} />
                          <span className="section-label" style={{ color:"rgba(6,182,212,0.5)" }}>Resumen IA</span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color:"var(--text-2)" }}>{resumen}</p>
                      </div>
                    )}

                    {/* Datos del paciente */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)" }}>
                        <p className="section-label mb-2">Datos capturados</p>
                        <div className="space-y-1.5 text-xs" style={{ color:"var(--text-2)" }}>
                          {telefono   && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {telefono}</p>}
                          {ciudad     && <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {ciudad}</p>}
                          {horario    && <p className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {horario}</p>}
                          {servicio   && <p className="flex items-center gap-1.5"><Stethoscope className="w-3 h-3" /> {SRV[servicio]??servicio}</p>}
                          {!ciudad && !horario && <p style={{ color:"var(--text-3)" }}>En proceso de captura</p>}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)" }}>
                        <p className="section-label mb-2">Estado</p>
                        <p className="text-xs mb-1" style={{ color:"var(--text-2)" }}>Conv: <strong style={{ color:"var(--text)" }}>{estado}</strong></p>
                        <p className="text-xs mb-1" style={{ color:"var(--text-2)" }}>Score: <strong style={{ color:score>=60?"var(--cyan)":"var(--text)" }}>{score}/100</strong></p>
                        <p className="text-xs" style={{ color:"var(--text-2)" }}>Última actividad:<br /><strong style={{ color:"var(--text)" }}>{formatDistanceToNow(act,{locale:es,addSuffix:true})}</strong></p>
                      </div>
                    </div>

                    {/* Notas internas */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <FileText className="w-3.5 h-3.5" style={{ color:"var(--text-3)" }} />
                        <p className="section-label">Notas internas del equipo</p>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Ej: Paciente inseguro por estética. Comparando con otra clínica. Interesado en financiación..."
                        value={notasTemp[p.id] ?? notas}
                        onChange={e => setNotasTemp(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-full text-sm rounded-xl px-3 py-2 resize-none"
                        style={{ background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", color:"var(--text)", lineHeight:1.5 }}
                      />
                      <button onClick={() => guardarNotas(p)} disabled={isSaving}
                        className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{ background:isSaving?"rgba(255,255,255,0.05)":"rgba(6,182,212,0.1)", color:isSaving?"var(--text-3)":"var(--cyan)", border:"1px solid rgba(6,182,212,0.2)" }}>
                        {isSaving ? "Guardando..." : "Guardar nota"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
