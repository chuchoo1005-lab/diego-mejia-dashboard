"use client";
import { useState } from "react";
import { Phone, Clock, MapPin, Stethoscope, Brain, FileText, ChevronDown, History } from "lucide-react";
import { formatDistanceToNow, format, isToday, isTomorrow, isYesterday, addDays } from "date-fns";
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

/* ══════════════════════════════════════════════════════════════════════════
   ETAPAS DEL CRM
   Cada etapa dice exactamente qué pasó con la persona, para que más adelante cada una
   sea un grupo al que se le pueda enviar un mensaje o un recordatorio.
   resultado_llamada (en perfil_paciente) guarda el valor; MAP_A_ETAPA lo traduce a la etapa.
   ══════════════════════════════════════════════════════════════════════════ */
export type Etapa =
  | "llamar" | "sin_terminar"
  | "no_contesto" | "volver_llamar" | "pensando"
  | "cerrados" | "reprogramo" | "asistio" | "no_asistio"
  | "no_interesado";

// value = lo que se guarda en resultado_llamada. "" = Para llamar (sin resultado).
export const RESULTADOS = [
  { value: "",              label: "Para llamar",         color: "#10B981", icon: "📞" },
  { value: "no_contesto",   label: "No contestó",         color: "#F97316", icon: "📵" },
  { value: "volver_llamar", label: "Volver a llamar",     color: "#38BDF8", icon: "📅" },
  { value: "pensando",      label: "Lo está pensando",    color: "#FBBF24", icon: "🤔" },
  { value: "cerrado",       label: "Valoración agendada", color: "#22D3EE", icon: "🏆" },
  { value: "reprogramo",    label: "Reprogramó",          color: "#60A5FA", icon: "🔁" },
  { value: "asistio",       label: "Asistió a la cita",   color: "#8B5CF6", icon: "✅" },
  { value: "no_asistio",    label: "No asistió",          color: "#FB923C", icon: "🚫" },
  { value: "no_interesado", label: "No interesado",       color: "#EF4444", icon: "✕"  },
];

// Valores guardados → etapa. Incluye los valores viejos para que nada quede perdido:
// "En proceso" y "En espera" no decían qué pasó; se muestran en "Lo está pensando" con un aviso para confirmar.
export const MAP_A_ETAPA: Record<string, string> = {
  no_contesto: "no_contesto", no_respondio: "no_contesto",
  volver_llamar: "volver_llamar",
  pensando: "pensando", proceso: "pensando", espera: "pensando", interesado: "pensando", seguimiento: "pensando",
  cerrado: "cerrados", valoracion_agendada: "cerrados",
  reprogramo: "reprogramo",
  asistio: "asistio", paciente_activo: "asistio", tratamiento_iniciado: "asistio",
  no_asistio: "no_asistio",
  no_interesado: "no_interesado",
};
const VALORES_VIEJOS = ["proceso", "espera", "interesado", "seguimiento"];

// Valores que detienen los seguimientos automáticos del bot (WF-07 lee estado_seguimiento).
export const RESULTADOS_TERMINALES = ["cerrado", "asistio", "no_interesado", "no_asistio"];

export function resultadoLlamada(p: Pick<Paciente, "perfil_paciente">): string { return (p.perfil_paciente?.resultado_llamada as string) || ""; }
export function etapaDe(p: Pick<Paciente, "perfil_paciente">): Etapa {
  const r = resultadoLlamada(p);
  return r ? ((MAP_A_ETAPA[r] as Etapa) ?? "llamar") : "llamar";
}
export function etapaInfo(resultado: string) {
  if (!resultado) return RESULTADOS[0];
  const etapa = MAP_A_ETAPA[resultado];
  if (etapa === "cerrados") return RESULTADOS.find(r => r.value === "cerrado")!;
  return RESULTADOS.find(r => r.value === etapa) ?? RESULTADOS[0];
}

/* ── Qué botones ve la persona según su etapa ── */
type Pide = "fecha_cita" | "dia";
export type Accion = { valor: string; label: string; icon: string; color: string; pide?: Pide };
const A = {
  noContesto:  { valor: "no_contesto",   label: "No contestó",          icon: "📵", color: "#F97316" },
  otraVezNo:   { valor: "no_contesto",   label: "Otra vez no contestó", icon: "📵", color: "#F97316" },
  volver:      { valor: "volver_llamar", label: "Volver a llamar",      icon: "📅", color: "#38BDF8", pide: "dia" as Pide },
  cambiarDia:  { valor: "volver_llamar", label: "Cambiar el día",       icon: "📅", color: "#38BDF8", pide: "dia" as Pide },
  pensando:    { valor: "pensando",      label: "Lo está pensando",     icon: "🤔", color: "#FBBF24" },
  agendo:      { valor: "cerrado",       label: "Agendó valoración",    icon: "✅", color: "#22D3EE", pide: "fecha_cita" as Pide },
  noInteresa:  { valor: "no_interesado", label: "No interesado",        icon: "✕",  color: "#EF4444" },
  asistio:     { valor: "asistio",       label: "Asistió",              icon: "✔️", color: "#8B5CF6" },
  noAsistio:   { valor: "no_asistio",    label: "No asistió",           icon: "🚫", color: "#FB923C" },
  cambioFecha: { valor: "reprogramo",    label: "Cambió la fecha",      icon: "🔁", color: "#60A5FA", pide: "fecha_cita" as Pide },
  otraFecha:   { valor: "reprogramo",    label: "Cambió otra vez",      icon: "🔁", color: "#60A5FA", pide: "fecha_cita" as Pide },
  nuevaFecha:  { valor: "reprogramo",    label: "Le dio nueva fecha",   icon: "🔁", color: "#60A5FA", pide: "fecha_cita" as Pide },
  cancelo:     { valor: "no_interesado", label: "Canceló",              icon: "✕",  color: "#EF4444" },
  reactivar:   { valor: "",              label: "Volver a contactar",   icon: "↩️", color: "#10B981" },
};
export const ACCIONES: Record<Etapa, Accion[]> = {
  llamar:        [A.noContesto, A.volver, A.pensando, A.agendo, A.noInteresa],
  sin_terminar:  [A.noContesto, A.volver, A.pensando, A.agendo, A.noInteresa],
  no_contesto:   [A.otraVezNo, A.volver, A.pensando, A.agendo, A.noInteresa],
  volver_llamar: [A.noContesto, A.cambiarDia, A.pensando, A.agendo, A.noInteresa],
  pensando:      [A.noContesto, A.volver, A.agendo, A.noInteresa],
  cerrados:      [A.asistio, A.noAsistio, A.cambioFecha, A.cancelo],
  reprogramo:    [A.asistio, A.noAsistio, A.otraFecha, A.cancelo],
  no_asistio:    [A.nuevaFecha, A.volver, A.noInteresa],
  asistio:       [],
  no_interesado: [A.reactivar],
};
const PIDE_DE: Record<string, Pide | undefined> = { cerrado: "fecha_cita", reprogramo: "fecha_cita", volver_llamar: "dia" };
const ETAPAS_DE_LLAMADA: Etapa[] = ["llamar", "sin_terminar", "no_contesto", "volver_llamar", "pensando"];

/* ── Lo que se guarda al mover a alguien ──
   Además del resultado, queda el historial (cada movimiento con fecha y hora), los intentos de llamada,
   la fecha de la cita o del día para volver a llamar. Es la base para recordatorios y mensajes futuros. */
export type Extra = { fecha?: string };
export function resultadoUpdates(valor: string, p?: Pick<Paciente, "perfil_paciente">, extra: Extra = {}): Record<string, unknown> {
  const pp = p?.perfil_paciente || {};
  const ahora = new Date().toISOString();
  const etapaAntes = p ? etapaDe(p) : "llamar";
  const u: Record<string, unknown> = { resultado_llamada: valor, resultado_at: ahora };
  if (RESULTADOS_TERMINALES.includes(valor)) u.estado_seguimiento = "cancelado";
  if (["no_contesto", "volver_llamar", "pensando"].includes(valor)
    || (["cerrado", "no_interesado"].includes(valor) && ETAPAS_DE_LLAMADA.includes(etapaAntes))) u.ultima_llamada_at = ahora;
  if (valor === "no_contesto") {
    u.intentos_llamada = (Number(pp.intentos_llamada) || 0) + 1;
    // Próximo intento automático: al día hábil siguiente (sin domingos). No hay que escribir nada.
    let d = addDays(new Date(), 1); if (d.getDay() === 0) d = addDays(d, 1);
    u.proximo_intento_el = format(d, "yyyy-MM-dd");
  }
  if (valor === "volver_llamar" && extra.fecha) u.volver_llamar_el = extra.fecha;
  if (valor === "cerrado" && extra.fecha) u.cita_valoracion_at = extra.fecha;
  if (valor === "reprogramo" && extra.fecha) {
    u.cita_anterior_at = pp.cita_valoracion_at ?? null;
    u.cita_valoracion_at = extra.fecha;
    u.reprogramaciones = (Number(pp.reprogramaciones) || 0) + 1;
  }
  const historial = Array.isArray(pp.historial_crm) ? (pp.historial_crm as unknown[]) : [];
  u.historial_crm = [...historial.slice(-49), { at: ahora, valor, ...(extra.fecha ? { fecha: extra.fecha } : {}) }];
  return u;
}

/* ── Fechas legibles ── */
// Las fechas de cita y de "volver a llamar" se guardan como hora local ("2026-11-25T09:00" o "2026-11-25").
function aFecha(v: unknown): Date | null {
  if (!v) return null;
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00") : new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function diaRelativo(d: Date): string {
  if (isToday(d)) return "hoy";
  if (isTomorrow(d)) return "mañana";
  if (isYesterday(d)) return "ayer";
  return format(d, "EEE d 'de' MMM", { locale: es });
}
function horaCorta(d: Date): string { return format(d, "h:mm aaa", { locale: es }).replace("a. m.", "a. m.").replace("p. m.", "p. m."); }
export function citaDe(p: Pick<Paciente, "perfil_paciente">): Date | null { return aFecha(p.perfil_paciente?.cita_valoracion_at); }
export function volverLlamarDe(p: Pick<Paciente, "perfil_paciente">): Date | null { return aFecha(p.perfil_paciente?.volver_llamar_el); }
export function proximoIntentoDe(p: Pick<Paciente, "perfil_paciente">): Date | null { return aFecha(p.perfil_paciente?.proximo_intento_el); }
// Fin del día de hoy: lo que tenga fecha hasta aquí "toca hoy".
export function finDeHoy(): number { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); }
function hace(v: unknown): string | null { const d = aFecha(v); return d ? formatDistanceToNow(d, { locale: es, addSuffix: true }) : null; }

// La línea de estado que se ve siempre en la tarjeta: qué pasó y qué sigue.
export function lineaEstado(p: Paciente, etapa: Etapa): { texto: string; color: string } | null {
  const pp = p.perfil_paciente || {};
  const intentos = Number(pp.intentos_llamada) || 0;
  const ultima = hace(pp.ultima_llamada_at);
  if (etapa === "llamar" || etapa === "sin_terminar") {
    return { texto: intentos ? `${intentos} ${intentos === 1 ? "intento" : "intentos"} antes · ${ultima ?? ""}` : "Todavía no la han llamado", color: "var(--text-2)" };
  }
  if (etapa === "no_contesto") {
    const prox = proximoIntentoDe(p);
    const toca = prox && prox.getTime() <= Date.now() ? " · toca intentar hoy" : prox ? ` · próximo intento ${diaRelativo(prox)}` : "";
    const extra = intentos >= 3 ? " · conviene escribirle por WhatsApp" : "";
    return { texto: `📵 ${intentos || 1} ${intentos === 1 ? "intento" : "intentos"} sin contestar · último ${ultima ?? ""}${toca}${extra}`, color: intentos >= 3 ? "#FBBF24" : "#F97316" };
  }
  if (etapa === "volver_llamar") {
    const d = volverLlamarDe(p);
    if (!d) return { texto: "📅 Pidió que la llamen otro día (sin fecha)", color: "#38BDF8" };
    const vencido = d.getTime() < new Date(new Date().toDateString()).getTime();
    return { texto: vencido ? `📅 Tocaba llamarla ${diaRelativo(d)}: está atrasada` : `📅 Llamar ${diaRelativo(d)}`, color: vencido ? "#EF4444" : isToday(d) ? "#10B981" : "#38BDF8" };
  }
  if (etapa === "pensando") {
    if (VALORES_VIEJOS.includes(resultadoLlamada(p))) return { texto: "Venía de \"En proceso / En espera\": confirma qué pasó", color: "#FBBF24" };
    return { texto: `🤔 Lo está pensando · desde ${hace(pp.resultado_at) ?? ""}`, color: "#FBBF24" };
  }
  if (etapa === "cerrados" || etapa === "reprogramo") {
    const d = citaDe(p);
    const veces = Number(pp.reprogramaciones) || 0;
    const rep = etapa === "reprogramo" ? ` · movió la cita ${veces || 1} ${veces === 1 || !veces ? "vez" : "veces"}` : "";
    if (!d) return { texto: `🗓 Sin fecha de cita: agrégala${rep}`, color: "#FBBF24" };
    const pasada = d.getTime() < Date.now() - 2 * 3600_000;
    if (pasada) return { texto: `🗓 La cita era ${diaRelativo(d)} ${horaCorta(d)}: ¿asistió?${rep}`, color: "#EF4444" };
    return { texto: `🗓 Cita ${diaRelativo(d)} · ${horaCorta(d)}${rep}`, color: isToday(d) || isTomorrow(d) ? "#10B981" : "#22D3EE" };
  }
  if (etapa === "no_asistio") { const d = citaDe(p); return { texto: d ? `🚫 No fue a la cita del ${diaRelativo(d)}` : "🚫 No fue a la cita", color: "#FB923C" }; }
  if (etapa === "asistio") { const d = citaDe(p); return { texto: d ? `✅ Fue a la valoración del ${diaRelativo(d)}` : "✅ Fue a la valoración", color: "#8B5CF6" }; }
  if (etapa === "no_interesado") return { texto: `✕ No interesada · ${hace(pp.resultado_at) ?? ""}`, color: "#EF4444" };
  return null;
}

/* ── Helpers de contacto ── */
export function formatTel(t: string | null): string {
  if (!t) return "";
  const c = t.replace(/\D/g, "");
  if (c.length >= 10 && c.startsWith("57")) return `+57 ${c.slice(2, 5)} ${c.slice(5, 8)} ${c.slice(8)}`;
  return t;
}
// Búsqueda por nombre, nombre de WhatsApp, código o teléfono. Los teléfonos se comparan solo por dígitos:
// se guardan como "573163779066" pero se muestran como "+57 316 377 9066", y el número que el paciente
// dio por chat (telefono_contacto) puede ser distinto al de su WhatsApp.
type Buscable = { alias?: string | null; telefono_encriptado: string | null; perfil_paciente: Record<string, unknown> };
const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function coincideBusqueda(p: Buscable, busqueda: string): boolean {
  const q = busqueda.trim();
  if (!q) return true;
  const qTexto = sinTildes(q);
  const textos = [p.perfil_paciente?.nombre, p.perfil_paciente?.nombre_whatsapp, p.alias];
  if (textos.some(t => t && sinTildes(String(t)).includes(qTexto))) return true;
  const d = q.replace(/\D/g, "");
  if (d.length < 3) return false;
  const dSinPais = d.length > 10 && d.startsWith("57") ? d.slice(2) : d;
  const tels = [p.telefono_encriptado, p.perfil_paciente?.telefono_contacto].map(t => String(t ?? "").replace(/\D/g, "")).filter(Boolean);
  return tels.some(t => t.includes(d) || t.includes(dSinPais));
}
export function displayName(p: Paciente): string {
  return (p.perfil_paciente?.nombre as string) || (p.perfil_paciente?.nombre_whatsapp as string) || formatTel(p.telefono_encriptado) || "Nuevo paciente";
}
export function sc(p: Paciente) { return parseInt(String(p.perfil_paciente?.score ?? "0")) || 0; }
export function ec(p: Paciente) { return (p.perfil_paciente?.estado_conv as string) || "nuevo"; }
export function ua(p: Paciente) { const v = p.perfil_paciente?.ultima_actividad_at as string; return v ? new Date(v) : new Date(p.updated_at); }
export function telContacto(p: Paciente): string { return formatTel((p.perfil_paciente?.telefono_contacto as string) || null); }
// Si telefono_contacto no tiene suficientes dígitos para ser un teléfono real (ej. "es este", "internacional"), usa el número real de WhatsApp
export function telAccionable(contacto: string | null | undefined, encriptado: string | null | undefined): string | null {
  const digitos = (contacto || "").replace(/\D/g, "");
  if (digitos.length >= 7) return contacto as string;
  // Usuarios con nombre de usuario de WhatsApp llegan con un BSUID (ej. "CO.1045256151806496") en vez de teléfono:
  // no sirve para llamar ni para wa.me, armaría un número que no existe
  return encriptado && !esBsuid(encriptado) ? encriptado : null;
}
export function esBsuid(t: string | null | undefined): boolean { return /^[A-Z]{2}\./.test(t || ""); }

// Notas: el agente y el bot escriben datos del registro en notas_internas ("Agente nuevo · PRIORIDAD…").
// Las notas del equipo van aparte (notas_equipo) para que no se mezclen ni se borren entre sí.
export function notasInternas(p: Pick<Paciente, "perfil_paciente">): string { return (p.perfil_paciente?.notas_internas as string) || ""; }
export function notasEquipo(p: Pick<Paciente, "perfil_paciente">): string { return (p.perfil_paciente?.notas_equipo as string) || ""; }

// Leads que registró el agente nuevo: mismo lugar y mismas acciones, solo con otro color para distinguirlos.
export const COLOR_AGENTE = "#3B82F6";
export function esDelAgente(p: Pick<Paciente, "perfil_paciente">): boolean { return p.perfil_paciente?.origen_agente === "agente_nuevo"; }
function EtiquetaAgente() {
  return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${COLOR_AGENTE}20`, color: COLOR_AGENTE, border: `1px solid ${COLOR_AGENTE}55` }}>AGENTE NUEVO</span>;
}

export interface CardHandlers {
  expanded: Set<string>;
  toggleExp: (id: string) => void;
  notasTemp: Record<string, string>;
  setNotasTemp: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: string | null;
  setResultado: (p: Paciente, valor: string, extra?: Extra) => void;
  guardarNotas: (p: Paciente) => void;
  toggleCandado: (p: Paciente) => void;
}

/* ══════════════════════════════════════════════════════════════════════════
   BOTONES "¿QUÉ PASÓ?"
   Solo muestra lo que tiene sentido para la etapa. Si el botón necesita un dato
   (fecha de la cita, día para volver a llamar) lo pide ahí mismo antes de guardar.
   ══════════════════════════════════════════════════════════════════════════ */
function hoyMas(dias: number): string { return format(addDays(new Date(), dias), "yyyy-MM-dd"); }

// Próximos días hábiles para elegir con un toque (sin domingos): Hoy, Mañana y los siguientes.
function diasRapidos(cantidad: number): { v: string; l: string }[] {
  const out: { v: string; l: string }[] = [];
  for (let d = 0; out.length < cantidad && d < 14; d++) {
    const f = addDays(new Date(), d);
    if (f.getDay() === 0) continue;
    const l = d === 0 ? "Hoy" : d === 1 ? "Mañana" : format(f, "EEE d", { locale: es }).replace(".", "");
    out.push({ v: format(f, "yyyy-MM-dd"), l: l.charAt(0).toUpperCase() + l.slice(1) });
  }
  return out;
}
const HORAS = [
  { v: "08:00", l: "8 a. m." }, { v: "09:00", l: "9 a. m." }, { v: "10:00", l: "10 a. m." }, { v: "11:00", l: "11 a. m." },
  { v: "14:00", l: "2 p. m." }, { v: "15:00", l: "3 p. m." }, { v: "16:00", l: "4 p. m." }, { v: "17:00", l: "5 p. m." },
];

function Chip({ activo, color, onClick, children }: { activo: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="min-h-[44px] px-1 rounded-xl text-[13px] font-semibold active:scale-[0.97]"
      style={{ background: activo ? color : "rgba(255,255,255,0.05)", color: activo ? "#000" : "var(--text-2)", border: `1px solid ${activo ? color : "var(--border)"}`, WebkitTapHighlightColor: "transparent" }}>
      {children}
    </button>
  );
}

// Elegir fecha con toques: día + hora (cita) o solo día (volver a llamar). "Otra fecha" abre el calendario.
// La fecha de la cita es opcional: si en la llamada no quedó clara, se guarda sin fecha y se completa después.
function PedirFecha({ accion, inicial, onGuardar, onCancelar, isSaving }: {
  accion: Accion; inicial?: string; onGuardar: (fecha?: string) => void; onCancelar: () => void; isSaving: boolean;
}) {
  const esCita = accion.pide === "fecha_cita";
  const [dia, setDia] = useState(inicial ? inicial.slice(0, 10) : "");
  const [hora, setHora] = useState(inicial && inicial.length > 10 ? inicial.slice(11, 16) : "");
  const [otra, setOtra] = useState(false);
  const dias = diasRapidos(6);
  const valor = esCita ? (dia ? `${dia}T${hora || "08:00"}` : "") : dia;
  const listo = esCita ? !!(dia && hora) : !!dia;

  // "Volver a llamar": un solo toque guarda.
  if (!esCita) {
    const opciones = [{ l: "Mañana", d: 1 }, { l: "En 3 días", d: 3 }, { l: "En una semana", d: 7 }, { l: "En 15 días", d: 15 }];
    return (
      <div className="rounded-2xl p-3 space-y-3" style={{ background: `${accion.color}10`, border: `1px solid ${accion.color}40` }}>
        <p className="text-sm font-bold" style={{ color: accion.color }}>{accion.icon} ¿Cuándo hay que volver a llamarla?</p>
        <div className="grid grid-cols-2 gap-2">
          {opciones.map(o => (
            <button key={o.l} type="button" disabled={isSaving} onClick={() => onGuardar(hoyMas(o.d))}
              className="min-h-[48px] rounded-xl text-[14px] font-bold active:scale-[0.97]"
              style={{ background: `${accion.color}18`, color: accion.color, border: `1.5px solid ${accion.color}55` }}>{o.l}</button>
          ))}
        </div>
        {otra ? (
          <input type="date" value={dia} min={hoyMas(0)} onChange={e => setDia(e.target.value)}
            className="w-full min-h-[48px] rounded-xl px-3 text-base"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text)", colorScheme: "dark" }} />
        ) : (
          <button type="button" onClick={() => setOtra(true)} className="text-[13px] font-semibold underline underline-offset-2" style={{ color: "var(--text-3)" }}>Otra fecha…</button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancelar} className="min-h-[48px] rounded-xl text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-2)", border: "1px solid var(--border)" }}>Cancelar</button>
          {otra && (
            <button type="button" disabled={!dia || isSaving} onClick={() => onGuardar(dia)} className="min-h-[48px] rounded-xl text-sm font-bold"
              style={{ background: dia ? accion.color : "rgba(255,255,255,0.05)", color: dia ? "#000" : "var(--text-3)" }}>Guardar</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-3 space-y-3" style={{ background: `${accion.color}10`, border: `1px solid ${accion.color}40` }}>
      <p className="text-sm font-bold" style={{ color: accion.color }}>{accion.icon} ¿Para cuándo quedó la valoración?</p>
      <div>
        <p className="section-label mb-1.5">Día</p>
        <div className="grid grid-cols-3 gap-1.5">
          {dias.map(d => <Chip key={d.v} activo={dia === d.v && !otra} color={accion.color} onClick={() => { setDia(d.v); setOtra(false); }}>{d.l}</Chip>)}
        </div>
        {otra ? (
          <input type="date" value={dia} min={hoyMas(0)} onChange={e => setDia(e.target.value)}
            className="mt-2 w-full min-h-[48px] rounded-xl px-3 text-base"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text)", colorScheme: "dark" }} />
        ) : (
          <button type="button" onClick={() => setOtra(true)} className="mt-2 text-[13px] font-semibold underline underline-offset-2" style={{ color: "var(--text-3)" }}>Otra fecha…</button>
        )}
      </div>
      <div>
        <p className="section-label mb-1.5">Hora</p>
        <div className="grid grid-cols-4 gap-1.5">
          {HORAS.map(hh => <Chip key={hh.v} activo={hora === hh.v} color={accion.color} onClick={() => setHora(hh.v)}>{hh.l}</Chip>)}
        </div>
      </div>
      <button type="button" disabled={!listo || isSaving} onClick={() => onGuardar(valor)}
        className="w-full min-h-[50px] rounded-xl text-[15px] font-bold"
        style={{ background: listo ? accion.color : "rgba(255,255,255,0.05)", color: listo ? "#000" : "var(--text-3)", opacity: isSaving ? 0.6 : 1 }}>
        {isSaving ? "Guardando…" : listo ? `Guardar · ${diaRelativo(aFecha(valor)!)} ${horaCorta(aFecha(valor)!)}` : "Elige día y hora"}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancelar} className="min-h-[44px] rounded-xl text-sm font-semibold"
          style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-2)", border: "1px solid var(--border)" }}>Cancelar</button>
        <button type="button" disabled={isSaving} onClick={() => onGuardar(undefined)} className="min-h-[44px] rounded-xl text-sm font-semibold"
          style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-2)", border: "1px solid var(--border)" }}>Guardar sin fecha</button>
      </div>
    </div>
  );
}

function BotonAccion({ a, onClick, isSaving }: { a: Accion; onClick: () => void; isSaving: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={isSaving}
      className="flex items-center justify-center gap-1.5 min-h-[48px] px-2 rounded-xl text-[14px] font-bold transition-all active:scale-[0.97] text-center leading-tight"
      style={{ background: `${a.color}14`, color: a.color, border: `1.5px solid ${a.color}45`, opacity: isSaving ? 0.6 : 1, WebkitTapHighlightColor: "transparent" }}>
      <span>{a.icon}</span><span>{a.label}</span>
    </button>
  );
}

export function AccionesEtapa({ p, etapa, isSaving, onMover }: {
  p: Pick<Paciente, "perfil_paciente">; etapa?: Etapa; isSaving: boolean; onMover: (valor: string, extra?: Extra) => void;
}) {
  const e = etapa ?? etapaDe(p);
  const [pidiendo, setPidiendo] = useState<Accion | null>(null);
  const [corregir, setCorregir] = useState(false);
  const elegir = (a: Accion) => { if (a.pide) { setPidiendo(a); return; } onMover(a.valor); setCorregir(false); };
  const acciones = ACCIONES[e] ?? [];
  const inicial = pidiendo?.pide === "fecha_cita" ? (p.perfil_paciente?.cita_valoracion_at as string | undefined)?.slice(0, 16)
    : (p.perfil_paciente?.volver_llamar_el as string | undefined);

  if (pidiendo) {
    return <PedirFecha accion={pidiendo} inicial={inicial} isSaving={isSaving}
      onCancelar={() => setPidiendo(null)}
      onGuardar={f => { onMover(pidiendo.valor, f ? { fecha: f } : {}); setPidiendo(null); setCorregir(false); }} />;
  }
  const actual = RESULTADOS.find(r => r.value === (e === "cerrados" ? "cerrado" : e)) ?? RESULTADOS[0];
  return (
    <div className="space-y-3">
      {acciones.length > 0 ? (
        <div>
          <p className="section-label mb-2 pt-2">{["cerrados", "reprogramo"].includes(e) ? "¿Qué pasó con la cita?" : e === "no_interesado" ? "¿Quiere retomar?" : "¿Qué pasó en la llamada?"}</p>
          <div className="grid grid-cols-2 gap-2">
            {acciones.map(a => <BotonAccion key={a.label} a={a} isSaving={isSaving} onClick={() => elegir(a)} />)}
          </div>
        </div>
      ) : (
        <p className="text-sm pt-2" style={{ color: "var(--text-3)" }}>Etapa final: ya fue a la valoración.</p>
      )}
      <button type="button" onClick={() => setCorregir(v => !v)} className="text-[13px] font-semibold underline underline-offset-2" style={{ color: "var(--text-3)" }}>
        {corregir ? "Cerrar" : "¿Te equivocaste? Corregir etapa"}
      </button>
      {corregir && (
        <div className="grid grid-cols-2 gap-2">
          {RESULTADOS.filter(r => r.value !== actual.value).map(r => (
            <BotonAccion key={r.value || "llamar"} isSaving={isSaving}
              a={{ valor: r.value, label: r.label, icon: r.icon, color: r.color, pide: PIDE_DE[r.value] }}
              onClick={() => elegir({ valor: r.value, label: r.label, icon: r.icon, color: r.color, pide: PIDE_DE[r.value] })} />
          ))}
        </div>
      )}
    </div>
  );
}

// Compatibilidad: la franja de alertas del inicio usa este nombre.
export function MoverBotones({ p, isSaving, onMover }: { p: Pick<Paciente, "perfil_paciente">; isSaving: boolean; onMover: (v: string, extra?: Extra) => void }) {
  return <AccionesEtapa p={p} isSaving={isSaving} onMover={onMover} />;
}

/* ── Historial de movimientos ── */
function Historial({ p }: { p: Paciente }) {
  const h = Array.isArray(p.perfil_paciente?.historial_crm) ? (p.perfil_paciente.historial_crm as { at: string; valor: string; fecha?: string }[]) : [];
  if (!h.length) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2"><History className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} /><p className="section-label">Historial</p></div>
      <ul className="space-y-1.5">
        {[...h].reverse().slice(0, 8).map((x, i) => {
          const r = etapaInfo(x.valor); const d = aFecha(x.at); const f = aFecha(x.fecha);
          return (
            <li key={i} className="text-[13px] leading-snug" style={{ color: "var(--text-2)" }}>
              <span style={{ color: "var(--text-3)" }}>{d ? format(d, "d MMM, h:mm aaa", { locale: es }) : ""}</span>
              {" · "}<span style={{ color: r.color, fontWeight: 600 }}>{r.icon} {r.label}</span>
              {f && <span> → {x.fecha && x.fecha.length > 10 ? `${diaRelativo(f)} ${horaCorta(f)}` : diaRelativo(f)}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TARJETA DEL PACIENTE (pensada primero para celular)
   ══════════════════════════════════════════════════════════════════════════ */
export function CardOtro({ p, accent, sinTerminarAgendar, etapa, h }: { p: Paciente; accent?: boolean; sinTerminarAgendar?: boolean; etapa?: Etapa; h: CardHandlers }) {
  const e: Etapa = etapa ?? (sinTerminarAgendar ? "sin_terminar" : etapaDe(p));
  const nombre = displayName(p);
  const tieneNombrePropio = !!p.perfil_paciente?.nombre;
  const nombreEsWhatsapp = !tieneNombrePropio && !!p.perfil_paciente?.nombre_whatsapp;
  const telC = telContacto(p);
  const telefono = formatTel(p.telefono_encriptado);
  const ciudad = p.perfil_paciente?.ciudad as string;
  const horario = p.perfil_paciente?.horario_contacto as string;
  const servicio = p.perfil_paciente?.servicio_interes as string;
  const resultado = resultadoLlamada(p);
  const infoRegistro = notasInternas(p);
  const isExp = h.expanded.has(p.id);
  const info = etapaInfo(resultado);
  const isSaving = h.saving === p.id;
  const callTel = telAccionable(p.perfil_paciente?.telefono_contacto as string, p.telefono_encriptado);
  const waNum = (callTel || "").replace(/\D/g, "");
  const waLink = waNum ? `https://wa.me/${waNum.startsWith("57") ? waNum : "57" + waNum}` : null;
  const resumen = p.perfil_paciente?.resumen_lead as string;
  const botActivo = !p.modo_humano;
  const agente = esDelAgente(p);
  const borderColor = agente ? `${COLOR_AGENTE}66` : accent ? "rgba(16,185,129,0.3)" : "var(--border)";
  const svc = servicio ? svcBadge(servicio) : null;
  const tiempoAtras = formatDistanceToNow(ua(p), { locale: es, addSuffix: true });
  const estado = lineaEstado(p, e);

  return (
    <div className="dm-card overflow-hidden" style={{ borderColor, ...(agente ? { background: `${COLOR_AGENTE}0A` } : {}) }}>
      <div className="px-4 pt-4 pb-3 space-y-2.5">
        {/* Nombre y etiquetas */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[16px] break-words" style={{ color: "var(--text)" }}>{nombre}</span>
            {agente && <EtiquetaAgente />}
            {resultado && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: `${info.color}20`, color: info.color, border: `1px solid ${info.color}40` }}>{info.icon} {info.label}</span>}
          </div>
          {nombreEsWhatsapp && <p className="text-[12px] italic" style={{ color: "var(--text-3)" }}>Nombre de WhatsApp, no confirmado</p>}
          {sinTerminarAgendar && (
            <p className="text-[13px] font-bold mt-1" style={{ color: tieneNombrePropio ? "#FBBF24" : "#FB923C" }}>
              🕓 {tieneNombrePropio ? "Dio su nombre, falta completar" : "Pidió agendar, no respondió más"}
            </p>
          )}
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>{p.alias} · {tiempoAtras}</p>
        </div>

        {/* Qué pasó y qué sigue */}
        {estado && <p className="text-[14px] font-semibold leading-snug" style={{ color: estado.color }}>{estado.texto}</p>}

        {/* Datos */}
        <div className="flex flex-wrap gap-1.5">
          {svc && <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: svc.bg, color: svc.color }}><Stethoscope className="w-3 h-3" /> {svc.label}</span>}
          {horario && <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-2)", border: "1px solid var(--border)" }}><Clock className="w-3 h-3" /> {horario}</span>}
          {ciudad && <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg uppercase" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-2)", border: "1px solid var(--border)" }}><MapPin className="w-3 h-3" /> {ciudad}</span>}
        </div>

        {/* Teléfonos */}
        <div>
          {telC && <p className="text-sm font-bold" style={{ color: "#10B981" }}>📞 {telC}</p>}
          {telefono && telefono !== telC && !esBsuid(p.telefono_encriptado) && <p className="text-sm" style={{ color: "var(--text-3)" }}>WA: {telefono}</p>}
          {!callTel && <p className="text-[13px]" style={{ color: "#FBBF24" }}>Sin número: escribió con nombre de usuario y WhatsApp no compartió su teléfono.</p>}
        </div>

        {/* Barra de contacto: botones grandes para el dedo */}
        <div className="flex gap-2">
          {callTel ? (
            <a href={`tel:${callTel}`} className="flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-xl text-[15px] font-bold active:scale-[0.98]"
              style={{ background: "#10B981", color: "#000", WebkitTapHighlightColor: "transparent" }}>
              <Phone className="w-4 h-4" /> Llamar
            </a>
          ) : (
            <span aria-disabled="true" className="flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-xl text-[15px] font-bold cursor-not-allowed select-none"
              style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-3)", border: "1px solid var(--border)" }}>
              <Phone className="w-4 h-4" /> Llamar
            </span>
          )}
          {waLink ? (
            <a href={waLink} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
              className="flex items-center justify-center w-12 min-h-[48px] rounded-xl text-lg active:scale-95"
              style={{ background: "rgba(37,211,102,0.12)", color: "#25D366", border: "1px solid rgba(37,211,102,0.3)", WebkitTapHighlightColor: "transparent" }}>💬</a>
          ) : (
            <span aria-disabled="true" className="flex items-center justify-center w-12 min-h-[48px] rounded-xl text-lg cursor-not-allowed"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", filter: "grayscale(1)", opacity: 0.5 }}>💬</span>
          )}
          <button type="button" onClick={() => h.toggleCandado(p)} aria-label={botActivo ? "Bot activo, tocar para pausar" : "Bot pausado, tocar para activar"}
            className="flex items-center justify-center w-12 min-h-[48px] rounded-xl text-lg"
            style={{ background: botActivo ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.12)", border: `1px solid ${botActivo ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.3)"}` }}>
            {botActivo ? "🤖" : "🔒"}
          </button>
        </div>

        {/* Abrir "¿Qué pasó?" */}
        <button type="button" onClick={() => h.toggleExp(p.id)}
          className="w-full flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl text-[14px] font-bold"
          style={{ background: isExp ? "rgba(255,255,255,0.04)" : "rgba(6,182,212,0.1)", color: isExp ? "var(--text-3)" : "var(--cyan)", border: `1px solid ${isExp ? "var(--border)" : "rgba(6,182,212,0.3)"}` }}>
          <ChevronDown className={`w-4 h-4 transition-transform ${isExp ? "rotate-180" : ""}`} />
          {isExp ? "Ocultar" : ["cerrados", "reprogramo"].includes(e) ? "Registrar qué pasó con la cita" : e === "asistio" ? "Ver detalle" : "Registrar qué pasó"}
        </button>
      </div>

      {isExp && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <AccionesEtapa p={p} etapa={e} isSaving={isSaving} onMover={(v, extra) => h.setResultado(p, v, extra)} />
          {resumen && (
            <div className="p-3 rounded-xl" style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.12)" }}>
              <div className="flex items-center gap-1.5 mb-1"><Brain className="w-3.5 h-3.5" style={{ color: "var(--cyan)" }} /><span className="section-label" style={{ color: "rgba(6,182,212,0.6)" }}>Resumen de la conversación</span></div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>{resumen}</p>
            </div>
          )}
          {infoRegistro && (
            <div>
              <p className="section-label mb-1">Datos del registro</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-3)" }}>{infoRegistro}</p>
            </div>
          )}
          <Historial p={p} />
          <div>
            <div className="flex items-center gap-1.5 mb-2"><FileText className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} /><p className="section-label">Notas del equipo</p></div>
            <textarea rows={3} placeholder="Ejemplo: quiere cerámica, prefiere que la llamen después de las 5"
              value={h.notasTemp[p.id] ?? notasEquipo(p)}
              onChange={ev => h.setNotasTemp(prev => ({ ...prev, [p.id]: ev.target.value }))}
              className="w-full text-base rounded-xl px-3 py-2 resize-none placeholder:italic placeholder:text-[var(--text-3)]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text)", lineHeight: 1.5 }} />
            <button type="button" onClick={() => h.guardarNotas(p)} disabled={isSaving}
              className="mt-2 w-full sm:w-auto min-h-[44px] px-5 rounded-xl text-sm font-bold"
              style={{ background: "rgba(6,182,212,0.1)", color: "var(--cyan)", border: "1px solid rgba(6,182,212,0.25)" }}>
              {isSaving ? "Guardando…" : "Guardar nota"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// La página de alertas usa CardListo para los que están listos para llamar: misma tarjeta, con borde verde.
export function CardListo({ p, h }: { p: Paciente; h: CardHandlers }) {
  return <CardOtro p={p} accent h={h} />;
}
