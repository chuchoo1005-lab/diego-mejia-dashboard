"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { Phone, Search, RefreshCw, Clock, MapPin, Stethoscope, Brain, FileText, ChevronDown, Flame } from "lucide-react";

interface Paciente {
  id: string; alias: string; calificado: boolean;
  telefono_encriptado: string | null; modo_humano: boolean;
  perfil_paciente: Record<string, unknown>; updated_at: string;
}

const SRV: Record<string, string> = { ortodoncia: "Ortodoncia invisible", invisalign: "Ortodoncia invisible", brackets: "Ortodoncia brackets", diseno: "Diseño de sonrisa", diseño: "Diseño de sonrisa", blanqueamiento: "Blanqueamiento", implantes: "Implantes", endodoncia: "Endodoncia", periodoncia: "Periodoncia", cirugia: "Cirugía oral", rehabilitacion: "Rehabilitación", odontopediatria: "Odontopediatría", ortopedia: "Ortopedia", general: "Odontología general" };
function svcBadge(s: string | null): { label: string; bg: string; color: string } {
  if (!s) return { label: "—", bg: "transparent", color: "var(--text-3)" };
  const label = SRV[s] ?? s;
  if (["ortodoncia","invisalign","brackets"].includes(s)) return { label, bg: "rgba(6,182,212,0.12)", color: "#22D3EE" };
  if (["diseno","blanqueamiento"].includes(s)) return { label, bg: "rgba(168,85,247,0.12)", color: "#C084FC" };
  if (["implantes","endodoncia","periodoncia","cirugia","rehabilitacion"].includes(s)) return { label, bg: "rgba(249,115,22,0.12)", color: "#FB923C" };
  return { label, bg: "rgba(16,185,129,0.12)", color: "#34D399" };
}
const NIVEL: Record<string, { label: string; color: string; bg: string }> = {
  alto:  { label: "🔥 Muy interesado", color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  medio: { label: "🤔 Evaluando",      color: "#FBBF24", bg: "rgba(251,191,36,0.12)" },
  bajo:  { label: "💤 Indeciso",       color: "var(--text-3)", bg: "rgba(255,255,255,0.05)" },
};

const RESULTADOS = [
  { value: "",                    label: "— Sin resultado —",        color: "var(--text-3)" },
  { value: "interesado",          label: "✅ Interesado",             color: "var(--green)" },
  { value: "valoracion_agendada", label: "📅 Valoración agendada",   color: "var(--cyan)" },
  { value: "seguimiento",         label: "🔄 En seguimiento",        color: "var(--amber)" },
  { value: "no_respondio",        label: "📵 No respondió",          color: "var(--text-3)" },
  { value: "no_interesado",       label: "❌ No interesado",         color: "var(--red)" },
  { value: "paciente_activo",     label: "🦷 Paciente activo",       color: "var(--cyan)" },
  { value: "tratamiento_iniciado",label: "💎 Tratamiento iniciado",  color: "var(--green)" },
  { value: "cerrado",             label: "🏆 Cerrado",               color: "var(--green)" },
];

function formatTel(t: string | null): string {
  if (!t) return "";
  const c = t.replace(/\D/g, "");
  if (c.length >= 10 && c.startsWith("57")) return `+57 ${c.slice(2, 5)} ${c.slice(5, 8)} ${c.slice(8)}`;
  return t;
}
function displayName(p: Paciente): string {
  return (p.perfil_paciente?.nombre as string) || (p.perfil_paciente?.nombre_whatsapp as string) || formatTel(p.telefono_encriptado) || "Nuevo paciente";
}
function sc(p: Paciente) { return parseInt(String(p.perfil_paciente?.score ?? "0")) || 0; }
function ec(p: Paciente) { return (p.perfil_paciente?.estado_conv as string) || "nuevo"; }
function ua(p: Paciente) { const v = p.perfil_paciente?.ultima_actividad_at as string; return v ? new Date(v) : new Date(p.updated_at); }
function telContacto(p: Paciente): string { return formatTel((p.perfil_paciente?.telefono_contacto as string) || null); }
function resultadoLlamada(p: Paciente): string { return (p.perfil_paciente?.resultado_llamada as string) || ""; }
function notasInternas(p: Paciente): string { return (p.perfil_paciente?.notas_internas as string) || ""; }

/* ── Shared handler props (cards must live outside CitasPage to avoid remount on every keystroke) ── */
interface CardHandlers {
  expanded: Set<string>;
  toggleExp: (id: string) => void;
  notasTemp: Record<string, string>;
  setNotasTemp: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: string | null;
  setResultado: (p: Paciente, valor: string) => void;
  guardarNotas: (p: Paciente) => void;
  toggleCandado: (p: Paciente) => void;
}

/* ── CardListo ───────────────────────────────────────────────────────────────── */
function CardListo({ p, h }: { p: Paciente; h: CardHandlers }) {
  const nombre = displayName(p);
  const telC = telContacto(p);
  const telefono = formatTel(p.telefono_encriptado);
  const ciudad = p.perfil_paciente?.ciudad as string;
  const horario = p.perfil_paciente?.horario_contacto as string;
  const servicio = p.perfil_paciente?.servicio_interes as string;
  const resumen = p.perfil_paciente?.resumen_lead as string;
  const resultado = resultadoLlamada(p);
  const notas = notasInternas(p);
  const isExp = h.expanded.has(p.id);
  const resultadoCfg = RESULTADOS.find(r => r.value === resultado);
  const isSaving = h.saving === p.id;
  const callTel = (p.perfil_paciente?.telefono_contacto as string) || p.telefono_encriptado;
  const waNum = ((p.perfil_paciente?.telefono_contacto as string) || p.telefono_encriptado || "").replace(/\D/g,"");
  const waLink = waNum ? `https://wa.me/${waNum.startsWith("57") ? waNum : "57"+waNum}` : null;
  const score = sc(p);
  const nivel = (p.perfil_paciente?.nivel_interes as string) || "bajo";
  const botActivo = !p.modo_humano;
  const nivelCfg = NIVEL[nivel] ?? NIVEL.bajo;
  const svc = servicio ? svcBadge(servicio) : null;
  const tiempoAtras = formatDistanceToNow(ua(p), { locale: es, addSuffix: true });

  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.25)", boxShadow: "0 0 20px rgba(16,185,129,0.06)" }}>
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, rgba(16,185,129,0.8), rgba(16,185,129,0.2))" }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold" style={{ color: "var(--text)", fontSize: "15px" }}>{nombre}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}>✓ LISTO PARA LLAMAR</span>
              {resultado && <span className="text-[11px] font-medium" style={{ color: resultadoCfg?.color ?? "var(--text-3)" }}>{resultadoCfg?.label}</span>}
            </div>
            <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{p.alias} · {tiempoAtras}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-center px-2.5 py-1.5 rounded-xl" style={{ background: score >= 60 ? "rgba(16,185,129,0.12)" : score >= 30 ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-lg font-black leading-none" style={{ color: score >= 60 ? "#10B981" : score >= 30 ? "#FBBF24" : "var(--text-3)" }}>{score}</p>
              <p className="text-[9px]" style={{ color: "var(--text-3)" }}>score</p>
            </div>
            <button onClick={() => h.toggleCandado(p)} title={botActivo ? "Bot activo — click para pausar" : "Bot pausado — click para activar"}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: botActivo ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.12)", color: botActivo ? "#10B981" : "#EF4444", border: `1px solid ${botActivo ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}` }}>
              {botActivo ? "🤖" : "🔒"}
            </button>
            {callTel && (
              <a href={`tel:${callTel}`} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "#10B981", color: "#000" }}>
                <Phone className="w-4 h-4" /> Llamar
              </a>
            )}
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-xl text-base transition-all active:scale-95"
                style={{ background:"rgba(37,211,102,0.12)", color:"#25D366", border:"1px solid rgba(37,211,102,0.25)", WebkitTapHighlightColor:"transparent" }}>
                💬
              </a>
            )}
          </div>
        </div>

        <div className="mb-3">
          {telC && <p className="text-sm font-bold" style={{ color: "#10B981" }}>📞 {telC}</p>}
          {telefono && telefono !== telC && <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>WA: {telefono}</p>}
        </div>

        <div className="flex flex-wrap gap-2 mb-2">
          {svc && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: svc.bg, color: svc.color }}>
              <Stethoscope className="w-3 h-3" /> {svc.label}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: nivelCfg.bg, color: nivelCfg.color }}>
            {nivelCfg.label}
          </span>
          {horario && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
              <Clock className="w-3 h-3" /> {horario}
            </span>
          )}
          {ciudad && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
              <MapPin className="w-3 h-3" /> {ciudad}
            </span>
          )}
        </div>

        {resumen && (
          <div className="mb-3 p-2.5 rounded-xl" style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.1)" }}>
            <div className="flex items-center gap-1 mb-1">
              <Brain className="w-3 h-3" style={{ color: "var(--cyan)" }} />
              <span className="text-[10px] font-bold" style={{ color: "rgba(6,182,212,0.6)" }}>RESUMEN IA</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
              {isExp ? resumen : resumen.length > 120 ? resumen.slice(0, 120) + "…" : resumen}
            </p>
          </div>
        )}

        <button onClick={() => h.toggleExp(p.id)} className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-3)" }}>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExp ? "rotate-180" : ""}`} />
          {isExp ? "Ocultar detalles" : "Ver resultado y notas"}
        </button>
      </div>

      {isExp && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(16,185,129,0.1)" }}>
          <div>
            <p className="section-label mb-2 pt-3">Resultado de la llamada</p>
            <div className="flex flex-wrap gap-2">
              {RESULTADOS.filter(r => r.value !== "").map(r => (
                <button key={r.value} onClick={() => h.setResultado(p, r.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: resultado === r.value ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", color: resultado === r.value ? "#FFF" : "var(--text-3)", border: `1px solid ${resultado === r.value ? "rgba(255,255,255,0.2)" : "var(--border)"}`, opacity: isSaving ? 0.6 : 1 }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
              <p className="section-label">Notas del equipo</p>
            </div>
            <textarea rows={3} placeholder="Ej: Comparando con otra clínica. Interesado en financiación..."
              value={h.notasTemp[p.id] ?? notas}
              onChange={e => h.setNotasTemp(prev => ({ ...prev, [p.id]: e.target.value }))}
              className="w-full text-sm rounded-xl px-3 py-2 resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text)", lineHeight: 1.5 }} />
            <button onClick={() => h.guardarNotas(p)} disabled={isSaving}
              className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: isSaving ? "rgba(255,255,255,0.05)" : "rgba(6,182,212,0.1)", color: isSaving ? "var(--text-3)" : "var(--cyan)", border: "1px solid rgba(6,182,212,0.2)" }}>
              {isSaving ? "Guardando..." : "Guardar nota"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CardOtro ────────────────────────────────────────────────────────────────── */
function CardOtro({ p, accent, h }: { p: Paciente; accent?: boolean; h: CardHandlers }) {
  const score = sc(p);
  const nombre = displayName(p);
  const telC = telContacto(p);
  const telefono = formatTel(p.telefono_encriptado);
  const ciudad = p.perfil_paciente?.ciudad as string;
  const horario = p.perfil_paciente?.horario_contacto as string;
  const servicio = p.perfil_paciente?.servicio_interes as string;
  const resultado = resultadoLlamada(p);
  const notas = notasInternas(p);
  const isExp = h.expanded.has(p.id);
  const resultadoCfg = RESULTADOS.find(r => r.value === resultado);
  const isSaving = h.saving === p.id;
  const callTel = (p.perfil_paciente?.telefono_contacto as string) || p.telefono_encriptado;
  const waNum = ((p.perfil_paciente?.telefono_contacto as string) || p.telefono_encriptado || "").replace(/\D/g,"");
  const waLink = waNum ? `https://wa.me/${waNum.startsWith("57") ? waNum : "57"+waNum}` : null;
  const resumen = p.perfil_paciente?.resumen_lead as string;
  const botActivo = !p.modo_humano;
  const borderColor = accent ? "rgba(6,182,212,0.2)" : "var(--border)";
  const accentColor = accent ? "var(--cyan)" : "var(--text-3)";

  return (
    <div className="dm-card overflow-hidden" style={{ borderColor }}>
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-black"
          style={{ background: accent ? "rgba(6,182,212,0.08)" : "rgba(255,255,255,0.04)", color: accentColor, border: `1px solid ${borderColor}` }}>
          {nombre.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>{nombre}</span>
            {resultado && <span className="text-[11px] font-medium" style={{ color: resultadoCfg?.color ?? "var(--text-3)" }}>{resultadoCfg?.label}</span>}
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs" style={{ color: "var(--text-3)" }}>
            {telC && <span style={{ color: "#059669" }}>📞 {telC}</span>}
            {telefono && telefono !== telC && <span>WA: {telefono}</span>}
            {servicio && (() => { const b = svcBadge(servicio); return <span className="font-semibold" style={{ color: b.color }}>{b.label}</span>; })()}
            {horario && <span>🕐 {horario}</span>}
            {ciudad && <span>📍 {ciudad}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right mr-1">
            <p className="text-base font-black" style={{ color: score >= 60 ? "var(--cyan)" : score >= 30 ? "var(--amber)" : "var(--text-3)" }}>{score}</p>
            <p className="text-[9px]" style={{ color: "var(--text-3)" }}>score</p>
          </div>
          <button onClick={() => h.toggleCandado(p)} title={botActivo ? "Bot activo — click para pausar" : "Bot pausado — click para activar"}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-sm transition-all"
            style={{ background: botActivo ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.1)", color: botActivo ? "#10B981" : "#EF4444", border: `1px solid ${botActivo ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.25)"}` }}>
            {botActivo ? "🤖" : "🔒"}
          </button>
          {(telC || telefono) && (
            <a href={`tel:${callTel}`} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
              style={{ background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" }}>
              <Phone className="w-3 h-3" /> Llamar
            </a>
          )}
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center w-7 h-7 rounded-lg text-sm transition-all active:scale-95"
              style={{ background:"rgba(37,211,102,0.1)", color:"#25D366", border:"1px solid rgba(37,211,102,0.2)", WebkitTapHighlightColor:"transparent" }}>
              💬
            </a>
          )}
          <button onClick={() => h.toggleExp(p.id)} className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExp ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isExp && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <p className="section-label mb-2 pt-2">Resultado de la llamada</p>
            <div className="flex flex-wrap gap-2">
              {RESULTADOS.filter(r => r.value !== "").map(r => (
                <button key={r.value} onClick={() => h.setResultado(p, r.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: resultado === r.value ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", color: resultado === r.value ? "#FFF" : "var(--text-3)", border: `1px solid ${resultado === r.value ? "rgba(255,255,255,0.2)" : "var(--border)"}`, opacity: isSaving ? 0.6 : 1 }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {resumen && (
            <div className="p-3 rounded-xl" style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.12)" }}>
              <div className="flex items-center gap-1.5 mb-1"><Brain className="w-3.5 h-3.5" style={{ color: "var(--cyan)" }} /><span className="section-label" style={{ color: "rgba(6,182,212,0.5)" }}>Resumen IA</span></div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>{resumen}</p>
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 mb-2"><FileText className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} /><p className="section-label">Notas del equipo</p></div>
            <textarea rows={2} placeholder="Notas internas..."
              value={h.notasTemp[p.id] ?? notas}
              onChange={e => h.setNotasTemp(prev => ({ ...prev, [p.id]: e.target.value }))}
              className="w-full text-sm rounded-xl px-3 py-2 resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text)", lineHeight: 1.5 }} />
            <button onClick={() => h.guardarNotas(p)} disabled={isSaving}
              className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(6,182,212,0.1)", color: "var(--cyan)", border: "1px solid rgba(6,182,212,0.2)" }}>
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────────── */
export default function CitasPage() {
  const [leads, setLeads] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [notasTemp, setNotasTemp] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("pacientes")
      .select("id,alias,calificado,telefono_encriptado,perfil_paciente,updated_at,modo_humano")
      .eq("estado", "activo").order("updated_at", { ascending: false }).limit(100);
    setLeads((data || []) as Paciente[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const updatePerfil = async (id: string, updates: Record<string, unknown>) => {
    setSaving(id);
    const pac = leads.find(p => p.id === id);
    if (!pac) return;
    const newPerfil = { ...(pac.perfil_paciente || {}), ...updates };
    await supabase.from("pacientes").update({ perfil_paciente: newPerfil }).eq("id", id);
    setLeads(prev => prev.map(p => p.id === id ? { ...p, perfil_paciente: newPerfil } : p));
    setSaving(null);
  };

  const setResultado = (p: Paciente, valor: string) => updatePerfil(p.id, { resultado_llamada: valor, resultado_at: new Date().toISOString() });
  const guardarNotas = (p: Paciente) => { const nota = notasTemp[p.id] ?? notasInternas(p); updatePerfil(p.id, { notas_internas: nota }); };

  const toggleCandado = async (p: Paciente) => {
    const nuevo = !p.modo_humano;
    setSaving(p.id);
    await supabase.from("pacientes").update({ modo_humano: nuevo, modo_humano_at: nuevo ? new Date().toISOString() : null }).eq("id", p.id);
    setLeads(prev => prev.map(x => x.id === p.id ? { ...x, modo_humano: nuevo } : x));
    setSaving(null);
  };

  const match = (p: Paciente) => {
    if (!busqueda) return true;
    const nom = displayName(p); const tel = formatTel(p.telefono_encriptado);
    return nom.toLowerCase().includes(busqueda.toLowerCase()) || tel.includes(busqueda);
  };

  const listos    = leads.filter(p => ec(p) === "entrega_premium" && match(p));
  const calientes = leads.filter(p => ec(p) !== "entrega_premium" && sc(p) >= 60 && match(p));
  const otros     = leads.filter(p => ec(p) !== "entrega_premium" && sc(p) < 60 && sc(p) >= 20 && match(p));

  const stats = {
    listos: leads.filter(p => ec(p) === "entrega_premium").length,
    calientes: leads.filter(p => sc(p) >= 60).length,
    agendados: leads.filter(p => resultadoLlamada(p) === "valoracion_agendada").length,
  };

  const toggleExp = (id: string) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const handlers: CardHandlers = { expanded, toggleExp, notasTemp, setNotasTemp, saving, setResultado, guardarNotas, toggleCandado };

  /* ── Render ─────────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Centro operativo</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)" }}>Leads para llamar</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>Actualización cada 30s</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Listos para llamar", value: stats.listos, color: "#10B981" },
          { label: "Score alto (≥60)",   value: stats.calientes, color: "var(--cyan)" },
          { label: "Valoraciones agendadas", value: stats.agendados, color: "#A78BFA" },
        ].map(({ label, value, color }) => (
          <div key={label} className="dm-card p-4">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-3)" }} />
        <input type="text" placeholder="Buscar por nombre o teléfono..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text)" }} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(6,182,212,0.2)", borderTopColor: "var(--cyan)" }} />
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── LISTOS PARA LLAMAR ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: "#10B981", boxShadow: "0 0 6px #10B981" }} />
              <h2 className="text-sm font-bold" style={{ color: "#10B981" }}>LISTOS PARA LLAMAR</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>{listos.length}</span>
            </div>
            {listos.length === 0 ? (
              <div className="dm-card p-8 text-center">
                <Phone className="w-7 h-7 mx-auto mb-2" style={{ color: "var(--text-3)" }} />
                <p className="text-sm" style={{ color: "var(--text-3)" }}>Sin leads listos aún</p>
              </div>
            ) : (
              <div className="space-y-3">
                {listos.map(p => <CardListo key={p.id} p={p} h={handlers} />)}
              </div>
            )}
          </section>

          {/* ── LEADS CALIENTES ── */}
          {calientes.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-3.5 h-3.5" style={{ color: "var(--cyan)" }} />
                <h2 className="text-sm font-bold" style={{ color: "var(--cyan)" }}>LEADS CALIENTES</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(6,182,212,0.1)", color: "var(--cyan)" }}>{calientes.length}</span>
              </div>
              <div className="space-y-2">
                {calientes.map(p => <CardOtro key={p.id} p={p} accent h={handlers} />)}
              </div>
            </section>
          )}

          {/* ── OTROS LEADS ── */}
          {otros.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: "var(--text-3)" }} />
                <h2 className="text-sm font-bold" style={{ color: "var(--text-3)" }}>EN PROCESO</h2>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-3)" }}>{otros.length}</span>
              </div>
              <div className="space-y-2">
                {otros.map(p => <CardOtro key={p.id} p={p} h={handlers} />)}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  );
}
