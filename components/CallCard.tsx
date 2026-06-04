"use client";
import { Phone, Clock, MapPin, Stethoscope, Brain, FileText, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export interface Paciente {
  id: string; alias: string; calificado: boolean;
  telefono_encriptado: string | null; modo_humano: boolean;
  perfil_paciente: Record<string, unknown>; updated_at: string;
}

export const SRV: Record<string, string> = {
  ortodoncia: "Ortodoncia invisible", invisalign: "Ortodoncia invisible", brackets: "Ortodoncia brackets",
  diseno: "Diseño de sonrisa", diseño: "Diseño de sonrisa", blanqueamiento: "Blanqueamiento",
  implantes: "Implantes", endodoncia: "Endodoncia", periodoncia: "Periodoncia",
  cirugia: "Cirugía oral", rehabilitacion: "Rehabilitación", odontopediatria: "Odontopediatría",
  ortopedia: "Ortopedia", general: "Odontología general",
};

export function svcBadge(s: string | null): { label: string; bg: string; color: string } {
  if (!s) return { label: "—", bg: "transparent", color: "var(--text-3)" };
  const label = SRV[s] ?? s;
  if (["ortodoncia","invisalign","brackets"].includes(s)) return { label, bg: "rgba(6,182,212,0.12)", color: "#22D3EE" };
  if (["diseno","blanqueamiento"].includes(s)) return { label, bg: "rgba(168,85,247,0.12)", color: "#C084FC" };
  if (["implantes","endodoncia","periodoncia","cirugia","rehabilitacion"].includes(s)) return { label, bg: "rgba(249,115,22,0.12)", color: "#FB923C" };
  return { label, bg: "rgba(16,185,129,0.12)", color: "#34D399" };
}

export const NIVEL: Record<string, { label: string; color: string; bg: string }> = {
  alto:  { label: "🔥 Muy interesado", color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  medio: { label: "🤔 Evaluando",      color: "#FBBF24", bg: "rgba(251,191,36,0.12)" },
  bajo:  { label: "💤 Indeciso",       color: "var(--text-3)", bg: "rgba(255,255,255,0.05)" },
};

// Opciones de movimiento manual entre etapas
export const RESULTADOS = [
  { value: "",              label: "Para llamar",   color: "#10B981", icon: "📞" },
  { value: "proceso",       label: "En proceso",    color: "#FBBF24", icon: "🔄" },
  { value: "cerrado",       label: "Cerrado",       color: "#22D3EE", icon: "🏆" },
  { value: "no_interesado", label: "No interesado", color: "#EF4444", icon: "✕"  },
];

// Compatibilidad con valores viejos de DB → etapa del pipeline
export const MAP_A_ETAPA: Record<string, string> = {
  proceso: "proceso", interesado: "proceso", seguimiento: "proceso",
  no_respondio: "proceso", valoracion_agendada: "cerrados",
  cerrado: "cerrados", paciente_activo: "cerrados", tratamiento_iniciado: "cerrados",
  no_interesado: "no_interesado",
};

export const RESULTADOS_TERMINALES = ["cerrados", "no_interesado"];

// Retorna la config de etapa según el valor guardado en DB
export function etapaInfo(resultado: string) {
  if (!resultado) return RESULTADOS[0]; // Para llamar
  const etapa = MAP_A_ETAPA[resultado];
  if (etapa === "cerrados") return RESULTADOS.find(r => r.value === "cerrado")!;
  return RESULTADOS.find(r => r.value === etapa) ?? RESULTADOS[0];
}

// Determina si un botón de movimiento está activo
function isActive(resultado: string, rValue: string): boolean {
  if (rValue === "") return !resultado;
  const etapa = MAP_A_ETAPA[resultado];
  if (rValue === "cerrado") return etapa === "cerrados";
  return etapa === rValue;
}

export function formatTel(t: string | null): string {
  if (!t) return "";
  const c = t.replace(/\D/g, "");
  if (c.length >= 10 && c.startsWith("57")) return `+57 ${c.slice(2, 5)} ${c.slice(5, 8)} ${c.slice(8)}`;
  return t;
}
export function displayName(p: Paciente): string {
  return (p.perfil_paciente?.nombre as string) || (p.perfil_paciente?.nombre_whatsapp as string) || formatTel(p.telefono_encriptado) || "Nuevo paciente";
}
export function sc(p: Paciente) { return parseInt(String(p.perfil_paciente?.score ?? "0")) || 0; }
export function ec(p: Paciente) { return (p.perfil_paciente?.estado_conv as string) || "nuevo"; }
export function ua(p: Paciente) { const v = p.perfil_paciente?.ultima_actividad_at as string; return v ? new Date(v) : new Date(p.updated_at); }
export function telContacto(p: Paciente): string { return formatTel((p.perfil_paciente?.telefono_contacto as string) || null); }
export function resultadoLlamada(p: Paciente): string { return (p.perfil_paciente?.resultado_llamada as string) || ""; }
export function notasInternas(p: Paciente): string { return (p.perfil_paciente?.notas_internas as string) || ""; }

export interface CardHandlers {
  expanded: Set<string>;
  toggleExp: (id: string) => void;
  notasTemp: Record<string, string>;
  setNotasTemp: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: string | null;
  setResultado: (p: Paciente, valor: string) => void;
  guardarNotas: (p: Paciente) => void;
  toggleCandado: (p: Paciente) => void;
}

/* ── Botones Mover a: (shared) ── */
function MoverBotones({ resultado, isSaving, onMover }: { resultado: string; isSaving: boolean; onMover: (v: string) => void }) {
  return (
    <div>
      <p className="section-label mb-2 pt-2">Mover a:</p>
      <div className="grid grid-cols-2 gap-2">
        {RESULTADOS.map(r => {
          const active = isActive(resultado, r.value);
          return (
            <button key={r.value} onClick={() => onMover(r.value)}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: active ? `${r.color}22` : "rgba(255,255,255,0.04)",
                color: active ? r.color : "rgba(255,255,255,0.35)",
                border: `1.5px solid ${active ? `${r.color}55` : "var(--border)"}`,
                opacity: isSaving ? 0.6 : 1,
              }}>
              <span>{r.icon}</span> {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── CardListo ── */
export function CardListo({ p, h }: { p: Paciente; h: CardHandlers }) {
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
  const etapa = etapaInfo(resultado);
  const isSaving = h.saving === p.id;
  const callTel = (p.perfil_paciente?.telefono_contacto as string) || p.telefono_encriptado;
  const waNum = ((p.perfil_paciente?.telefono_contacto as string) || p.telefono_encriptado || "").replace(/\D/g, "");
  const waLink = waNum ? `https://wa.me/${waNum.startsWith("57") ? waNum : "57" + waNum}` : null;
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
              {resultado && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${etapa.color}20`, color: etapa.color, border: `1px solid ${etapa.color}40` }}>{etapa.icon} {etapa.label}</span>}
            </div>
            <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{p.alias} · {tiempoAtras}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-center px-2.5 py-1.5 rounded-xl" style={{ background: score >= 60 ? "rgba(16,185,129,0.12)" : score >= 30 ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-lg font-black leading-none" style={{ color: score >= 60 ? "#10B981" : score >= 30 ? "#FBBF24" : "var(--text-3)" }}>{score}</p>
              <p className="text-[9px]" style={{ color: "var(--text-3)" }}>score</p>
            </div>
            <button onClick={() => h.toggleCandado(p)} title={botActivo ? "Bot activo" : "Bot pausado"}
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
                style={{ background: "rgba(37,211,102,0.12)", color: "#25D366", border: "1px solid rgba(37,211,102,0.25)", WebkitTapHighlightColor: "transparent" }}>
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
          {svc && <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: svc.bg, color: svc.color }}><Stethoscope className="w-3 h-3" /> {svc.label}</span>}
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: nivelCfg.bg, color: nivelCfg.color }}>{nivelCfg.label}</span>
          {horario && <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-2)", border: "1px solid var(--border)" }}><Clock className="w-3 h-3" /> {horario}</span>}
          {ciudad && <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-2)", border: "1px solid var(--border)" }}><MapPin className="w-3 h-3" /> {ciudad}</span>}
        </div>
        {resumen && (
          <div className="mb-3 p-2.5 rounded-xl" style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.1)" }}>
            <div className="flex items-center gap-1 mb-1"><Brain className="w-3 h-3" style={{ color: "var(--cyan)" }} /><span className="text-[10px] font-bold" style={{ color: "rgba(6,182,212,0.6)" }}>RESUMEN IA</span></div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>{isExp ? resumen : resumen.length > 120 ? resumen.slice(0, 120) + "…" : resumen}</p>
          </div>
        )}
        <button onClick={() => h.toggleExp(p.id)} className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-3)" }}>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExp ? "rotate-180" : ""}`} />
          {isExp ? "Ocultar" : "Registrar resultado"}
        </button>
      </div>
      {isExp && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(16,185,129,0.1)" }}>
          <MoverBotones resultado={resultado} isSaving={isSaving} onMover={v => h.setResultado(p, v)} />
          <div>
            <div className="flex items-center gap-1.5 mb-2"><FileText className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} /><p className="section-label">Notas del equipo</p></div>
            <textarea rows={3} placeholder="Ej: Llamé, no contestó. Volver a llamar mañana..."
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

/* ── CardOtro ── */
export function CardOtro({ p, accent, h }: { p: Paciente; accent?: boolean; h: CardHandlers }) {
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
  const etapa = etapaInfo(resultado);
  const isSaving = h.saving === p.id;
  const callTel = (p.perfil_paciente?.telefono_contacto as string) || p.telefono_encriptado;
  const waNum = ((p.perfil_paciente?.telefono_contacto as string) || p.telefono_encriptado || "").replace(/\D/g, "");
  const waLink = waNum ? `https://wa.me/${waNum.startsWith("57") ? waNum : "57" + waNum}` : null;
  const resumen = p.perfil_paciente?.resumen_lead as string;
  const botActivo = !p.modo_humano;
  const borderColor = accent ? "rgba(6,182,212,0.2)" : "var(--border)";
  const svc = servicio ? svcBadge(servicio) : null;
  const tiempoAtras = formatDistanceToNow(ua(p), { locale: es, addSuffix: true });

  return (
    <div className="dm-card overflow-hidden" style={{ borderColor }}>

      {/* ── Fila 1: nombre + botones ── */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-bold text-[15px]" style={{ color: "var(--text)" }}>{nombre}</span>
            {resultado && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${etapa.color}20`, color: etapa.color, border: `1px solid ${etapa.color}40` }}>{etapa.icon} {etapa.label}</span>}
          </div>
          <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{p.alias} · {tiempoAtras}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-center px-2 py-1 rounded-xl" style={{ background: score >= 60 ? "rgba(16,185,129,0.12)" : score >= 30 ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-base font-black leading-none" style={{ color: score >= 60 ? "#10B981" : score >= 30 ? "#FBBF24" : "var(--text-3)" }}>{score}</p>
            <p className="text-[9px]" style={{ color: "var(--text-3)" }}>score</p>
          </div>
          <button onClick={() => h.toggleCandado(p)} title={botActivo ? "Bot activo" : "Bot pausado"}
            className="flex items-center justify-center w-8 h-8 rounded-xl text-sm transition-all"
            style={{ background: botActivo ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.1)", color: botActivo ? "#10B981" : "#EF4444", border: `1px solid ${botActivo ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.25)"}` }}>
            {botActivo ? "🤖" : "🔒"}
          </button>
          {callTel && (
            <a href={`tel:${callTel}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: "#10B981", color: "#000" }}>
              <Phone className="w-3.5 h-3.5" /> Llamar
            </a>
          )}
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-xl text-sm transition-all active:scale-95"
              style={{ background: "rgba(37,211,102,0.1)", color: "#25D366", border: "1px solid rgba(37,211,102,0.2)", WebkitTapHighlightColor: "transparent" }}>
              💬
            </a>
          )}
        </div>
      </div>

      {/* ── Fila 2: teléfonos ── */}
      <div className="px-4 mb-2">
        {telC && <p className="text-sm font-bold" style={{ color: "#10B981" }}>📞 {telC}</p>}
        {telefono && telefono !== telC && <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>WA: {telefono}</p>}
      </div>

      {/* ── Fila 3: tags + expand ── */}
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-2 mb-2">
          {svc && <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: svc.bg, color: svc.color }}><Stethoscope className="w-3 h-3" /> {svc.label}</span>}
          {horario && <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-2)", border: "1px solid var(--border)" }}><Clock className="w-3 h-3" /> {horario}</span>}
          {ciudad && <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-2)", border: "1px solid var(--border)" }}><MapPin className="w-3 h-3" /> {ciudad}</span>}
        </div>
        <button onClick={() => h.toggleExp(p.id)} className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-3)" }}>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExp ? "rotate-180" : ""}`} />
          {isExp ? "Ocultar" : "Registrar resultado"}
        </button>
      </div>
      {isExp && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <MoverBotones resultado={resultado} isSaving={isSaving} onMover={v => h.setResultado(p, v)} />
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
