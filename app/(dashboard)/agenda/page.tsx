"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, X, RefreshCw, Phone, Stethoscope, MessageCircle } from "lucide-react";
import { telAccionable } from "@/components/CallCard";

interface Cita {
  id: string; paciente_nombre: string; paciente_telefono: string | null;
  servicio: string | null; fecha_hora: string; duracion_min: number;
  estado: string; notas: string | null;
}

interface Lead {
  id: string; alias: string;
  telefono_encriptado: string | null;
  perfil_paciente: Record<string, unknown>;
  updated_at: string;
}

const SRV: Record<string, string> = {
  ortodoncia: "Ortodoncia invisible", invisalign: "Ortodoncia invisible",
  brackets: "Ortodoncia brackets", diseno: "Diseño de sonrisa",
  blanqueamiento: "Blanqueamiento", implantes: "Implantes",
  endodoncia: "Endodoncia", periodoncia: "Periodoncia",
  cirugia: "Cirugía oral", rehabilitacion: "Rehabilitación",
  odontopediatria: "Odontopediatría", ortopedia: "Ortopedia",
  general: "Odontología general", valoracion: "Valoración"
};

const SRV_COLOR: Record<string, { bg: string; color: string }> = {
  ortodoncia: { bg: "rgba(6,182,212,0.12)", color: "#22D3EE" },
  invisalign: { bg: "rgba(6,182,212,0.12)", color: "#22D3EE" },
  brackets:   { bg: "rgba(6,182,212,0.12)", color: "#22D3EE" },
  diseno:     { bg: "rgba(168,85,247,0.12)", color: "#C084FC" },
  blanqueamiento: { bg: "rgba(168,85,247,0.12)", color: "#C084FC" },
  implantes:  { bg: "rgba(249,115,22,0.12)", color: "#FB923C" },
  endodoncia: { bg: "rgba(249,115,22,0.12)", color: "#FB923C" },
  periodoncia:{ bg: "rgba(249,115,22,0.12)", color: "#FB923C" },
  cirugia:    { bg: "rgba(249,115,22,0.12)", color: "#FB923C" },
  rehabilitacion: { bg: "rgba(249,115,22,0.12)", color: "#FB923C" },
};

const ESTADO_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  pendiente:   { bg: "rgba(251,191,36,0.1)",  color: "#FBBF24", border: "rgba(251,191,36,0.3)" },
  confirmada:  { bg: "rgba(6,182,212,0.1)",   color: "var(--cyan)", border: "rgba(6,182,212,0.3)" },
  completada:  { bg: "rgba(16,185,129,0.1)",  color: "#10B981", border: "rgba(16,185,129,0.3)" },
  cancelada:   { bg: "rgba(239,68,68,0.1)",   color: "#EF4444", border: "rgba(239,68,68,0.3)" },
  no_asistio:  { bg: "rgba(255,255,255,0.05)", color: "var(--text-3)", border: "var(--border)" },
};
const ESTADOS = ["pendiente","confirmada","completada","cancelada","no_asistio"];
const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente", confirmada: "Confirmada", completada: "Completada",
  cancelada: "Cancelada", no_asistio: "No asistió"
};

const BLANK_FORM = { paciente_nombre: "", paciente_telefono: "", servicio: "valoracion", fecha: "", hora: "", duracion_min: 60, estado: "pendiente", notas: "" };

function getHorarioUrgencia(horario: string): { label: string; color: string; bg: string; border: string } {
  const h = horario.toLowerCase();
  if (h.includes("hoy") || h.includes("ahora") || h.includes("lo antes") || h.includes("urgente"))
    return { label: "HOY", color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" };
  if (h.includes("mañana") || h.includes("manana"))
    return { label: "MAÑANA", color: "#FBBF24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)" };
  if (["lunes","martes","miércoles","miercoles","jueves","viernes","sábado","sabado","domingo"].some(d => h.includes(d)))
    return { label: "ESTA SEMANA", color: "var(--cyan)", bg: "rgba(6,182,212,0.08)", border: "rgba(6,182,212,0.2)" };
  return { label: "PRÓXIMO", color: "var(--text-2)", bg: "rgba(255,255,255,0.04)", border: "var(--border)" };
}

function formatTel(t: string | null): string {
  if (!t) return "";
  const c = t.replace(/\D/g, "");
  if (c.length >= 10 && c.startsWith("57")) return `+57 ${c.slice(2,5)} ${c.slice(5,8)} ${c.slice(8)}`;
  return t;
}

export default function AgendaPage() {
  const [mes, setMes] = useState(new Date());
  const [citas, setCitas] = useState<Cita[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date>(new Date());
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  const load = useCallback(async () => {
    const ini = format(startOfMonth(mes), "yyyy-MM-dd");
    const fin = format(endOfMonth(mes), "yyyy-MM-dd");
    const [citasRes, leadsRes] = await Promise.all([
      supabase.from("agenda_citas")
        .select("*").gte("fecha_hora", ini + "T00:00:00").lte("fecha_hora", fin + "T23:59:59")
        .order("fecha_hora"),
      supabase.from("pacientes")
        .select("id,alias,telefono_encriptado,perfil_paciente,updated_at")
        .eq("estado", "activo")
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);
    setCitas((citasRes.data || []) as Cita[]);
    const todos = (leadsRes.data || []) as Lead[];
    setLeads(todos.filter(p => {
      const ec = (p.perfil_paciente?.estado_conv as string) || "";
      const horario = (p.perfil_paciente?.horario_contacto as string) || "";
      return ec === "entrega_premium" && horario;
    }));
  }, [mes]);

  // Refresco automático como respaldo (por si el canal de tiempo real se desconecta un momento)
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  // Sincronización en tiempo real: cambios en "pacientes" (nuevos agendamientos sin terminar) y en
  // "agenda_citas" (crear/editar/mover/borrar una cita desde cualquier dispositivo) se reflejan al instante aquí
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const reload = () => { if (timeout) clearTimeout(timeout); timeout = setTimeout(load, 800); };
    const channel = supabase
      .channel("realtime-agenda")
      .on("postgres_changes", { event: "*", schema: "public", table: "pacientes" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "agenda_citas" }, reload)
      .subscribe();
    return () => { if (timeout) clearTimeout(timeout); supabase.removeChannel(channel); };
  }, [load]);

  const ini = startOfWeek(startOfMonth(mes), { weekStartsOn: 1 });
  const fin = endOfWeek(endOfMonth(mes), { weekStartsOn: 1 });
  const dias = eachDayOfInterval({ start: ini, end: fin });
  const citasDia = (dia: Date) => citas.filter(c => isSameDay(new Date(c.fecha_hora), dia));
  const citasSeleccionadas = citasDia(diaSeleccionado);

  const guardar = async () => {
    if (!form.paciente_nombre || !form.fecha || !form.hora) return;
    setSaving(true);
    const fecha_hora = form.fecha + "T" + form.hora + ":00";
    const payload = { paciente_nombre: form.paciente_nombre, paciente_telefono: form.paciente_telefono || null, servicio: form.servicio || null, fecha_hora, duracion_min: Number(form.duracion_min), estado: form.estado, notas: form.notas || null };
    if (editando) {
      await supabase.from("agenda_citas").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editando);
    } else {
      await supabase.from("agenda_citas").insert(payload);
    }
    await load(); setModal(false); setForm(BLANK_FORM); setEditando(null); setSaving(false);
  };

  const eliminar = async (id: string) => {
    await supabase.from("agenda_citas").delete().eq("id", id);
    await load();
  };

  const cambiarEstado = async (id: string, estado: string) => {
    await supabase.from("agenda_citas").update({ estado, updated_at: new Date().toISOString() }).eq("id", id);
    await load();
  };

  const crearCitaDesdeLead = (lead: Lead) => {
    const nombre = (lead.perfil_paciente?.nombre as string) || (lead.perfil_paciente?.nombre_whatsapp as string) || formatTel(lead.telefono_encriptado) || "";
    const tel = (lead.perfil_paciente?.telefono_contacto as string) || lead.telefono_encriptado || "";
    const srv = (lead.perfil_paciente?.servicio_interes as string) || "valoracion";
    const horarioTxt = (lead.perfil_paciente?.horario_contacto as string) || "";
    setForm({ ...BLANK_FORM, paciente_nombre: nombre, paciente_telefono: formatTel(tel), servicio: SRV[srv] ? srv : "valoracion", notas: `Horario solicitado por WhatsApp: "${horarioTxt}"` });
    setEditando(null); setModal(true);
  };

  const DIAS_SEMANA = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

  // Ordenar leads por urgencia
  const urgenciaOrder = (h: string) => {
    const u = getHorarioUrgencia(h).label;
    return u === "HOY" ? 0 : u === "MAÑANA" ? 1 : u === "ESTA SEMANA" ? 2 : 3;
  };
  const leadsSorted = [...leads].sort((a, b) => {
    const ha = (a.perfil_paciente?.horario_contacto as string) || "";
    const hb = (b.perfil_paciente?.horario_contacto as string) || "";
    return urgenciaOrder(ha) - urgenciaOrder(hb);
  });


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Gestión de tiempo</p>
          <h1 style={{ fontFamily:"var(--font-cormorant)", fontSize:"2rem", fontWeight:500, color:"var(--text)" }}>Agenda de citas</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-3)" }}>{citas.length} citas · {leads.length} leads esperando</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl" style={{ background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", color:"var(--text-2)" }}>
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setForm(BLANK_FORM); setEditando(null); setModal(true); }}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-semibold"
            style={{ background:"var(--cyan)", color:"#000" }}>
            <Plus className="w-4 h-4" /> Nueva cita
          </button>
        </div>
      </div>

      {/* ── Solicitudes de contacto (leads del bot) ── */}
      {leadsSorted.length > 0 && (
        <div className="dm-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-4 h-4" style={{ color:"var(--cyan)" }} />
            <p className="section-label">Solicitudes de contacto vía WhatsApp</p>
            <span className="text-sm px-2 py-0.5 rounded-full font-bold" style={{ background:"rgba(6,182,212,0.1)", color:"var(--cyan)", border:"1px solid rgba(6,182,212,0.2)" }}>{leadsSorted.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {leadsSorted.map(lead => {
              const nombre = (lead.perfil_paciente?.nombre as string) || (lead.perfil_paciente?.nombre_whatsapp as string) || formatTel(lead.telefono_encriptado) || "Desconocido";
              const telC = formatTel((lead.perfil_paciente?.telefono_contacto as string) || null);
              const telWA = formatTel(lead.telefono_encriptado);
              const servicio = (lead.perfil_paciente?.servicio_interes as string) || "";
              const horario = (lead.perfil_paciente?.horario_contacto as string) || "";
              const resumen = (lead.perfil_paciente?.resumen_lead as string) || "";
              const urgencia = getHorarioUrgencia(horario);
              const svcColor = SRV_COLOR[servicio] || { bg: "rgba(16,185,129,0.1)", color: "#34D399" };
              const tiempoAtras = formatDistanceToNow(new Date(lead.updated_at), { locale: es, addSuffix: true });
              const telAcc = telAccionable(lead.perfil_paciente?.telefono_contacto as string, lead.telefono_encriptado);
              const waClean = (telAcc || "").replace(/\D/g, "");
              const waLink = waClean ? `https://wa.me/${waClean.startsWith("57") ? waClean : "57" + waClean}` : null;

              return (
                <div key={lead.id} className="p-4 rounded-xl relative" style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${urgencia.border}` }}>
                  {/* Urgencia badge */}
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[13px] font-black px-2 py-0.5 rounded-full" style={{ background: urgencia.bg, color: urgencia.color, border:`1px solid ${urgencia.border}` }}>
                      {urgencia.label}
                    </span>
                    <span className="text-[13px]" style={{ color:"var(--text-3)" }}>{tiempoAtras}</span>
                  </div>

                  {/* Nombre */}
                  <p className="font-bold text-sm mb-1" style={{ color:"var(--text)" }}>{nombre}</p>
                  <p className="text-[13px] mb-2.5" style={{ color:"var(--text-3)" }}>{lead.alias}</p>

                  {/* Horario destacado */}
                  <div className="flex items-center gap-1.5 mb-2.5 px-2.5 py-1.5 rounded-lg" style={{ background: urgencia.bg, border:`1px solid ${urgencia.border}` }}>
                    <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: urgencia.color }} />
                    <span className="text-sm font-semibold" style={{ color: urgencia.color }}>{horario}</span>
                  </div>

                  {/* Servicio + teléfonos */}
                  <div className="space-y-1 mb-3">
                    {servicio && (
                      <span className="inline-flex items-center gap-1 text-[14px] px-2 py-0.5 rounded-lg font-medium" style={{ background: svcColor.bg, color: svcColor.color }}>
                        <Stethoscope className="w-3 h-3" /> {SRV[servicio] ?? servicio}
                      </span>
                    )}
                    {telC && <p className="text-sm font-semibold" style={{ color:"#10B981" }}>📞 {telC}</p>}
                    {telWA && telWA !== telC && <p className="text-sm" style={{ color:"var(--text-3)" }}>WA: {telWA}</p>}
                  </div>

                  {/* Resumen IA si existe */}
                  {resumen && (
                    <p className="text-[14px] mb-3 px-2 py-1.5 rounded-lg italic" style={{ color:"var(--text-2)", background:"rgba(6,182,212,0.05)", border:"1px solid rgba(6,182,212,0.1)" }}>
                      "{resumen.length > 80 ? resumen.slice(0,80) + "…" : resumen}"
                    </p>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2">
                    {(telC || telWA) && (
                      <a href={`tel:${telAcc}`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-bold flex-1 justify-center"
                        style={{ background:"rgba(16,185,129,0.12)", color:"#10B981", border:"1px solid rgba(16,185,129,0.25)" }}>
                        <Phone className="w-3 h-3" /> Llamar
                      </a>
                    )}
                    {waLink && (
                      <a href={waLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center w-9 h-9 rounded-lg text-sm shrink-0 active:scale-95 transition-all"
                        style={{ background:"rgba(37,211,102,0.12)", color:"#25D366", border:"1px solid rgba(37,211,102,0.25)", WebkitTapHighlightColor:"transparent" }}>
                        💬
                      </a>
                    )}
                    <button onClick={() => crearCitaDesdeLead(lead)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-bold flex-1 justify-center"
                      style={{ background:"rgba(6,182,212,0.1)", color:"var(--cyan)", border:"1px solid rgba(6,182,212,0.2)" }}>
                      <Plus className="w-3 h-3" /> Agendar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Calendario ── */}
        <div className="xl:col-span-2 dm-card p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMes(subMonths(mes, 1))} className="p-2 rounded-lg hover:bg-white/5 transition-colors"><ChevronLeft className="w-4 h-4" style={{ color:"var(--text-2)" }} /></button>
            <h2 className="font-bold capitalize" style={{ color:"var(--text)", fontFamily:"var(--font-cormorant)", fontSize:"1.1rem" }}>
              {format(mes, "MMMM yyyy", { locale: es })}
            </h2>
            <button onClick={() => setMes(addMonths(mes, 1))} className="p-2 rounded-lg hover:bg-white/5 transition-colors"><ChevronRight className="w-4 h-4" style={{ color:"var(--text-2)" }} /></button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d => <div key={d} className="text-center section-label py-1">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {dias.map(dia => {
              const esMismoMes = dia.getMonth() === mes.getMonth();
              const dc = citasDia(dia);
              const esHoy = isToday(dia);
              const esSeleccionado = isSameDay(dia, diaSeleccionado);
              return (
                <button key={dia.toISOString()} onClick={() => setDiaSeleccionado(dia)}
                  className="relative flex flex-col items-center justify-start p-1.5 rounded-xl min-h-[52px] transition-all text-sm font-medium"
                  style={{
                    background: esSeleccionado ? "rgba(6,182,212,0.15)" : esHoy ? "rgba(255,255,255,0.06)" : "transparent",
                    color: !esMismoMes ? "var(--text-3)" : esSeleccionado ? "var(--cyan)" : esHoy ? "#FFF" : "var(--text-2)",
                    border: esSeleccionado ? "1px solid rgba(6,182,212,0.3)" : esHoy ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
                  }}>
                  <span>{dia.getDate()}</span>
                  {dc.length > 0 && esMismoMes && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {dc.slice(0,3).map((c, i) => {
                        const ec = ESTADO_COLOR[c.estado];
                        return <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: ec?.color ?? "var(--amber)" }} />;
                      })}
                      {dc.length > 3 && <span className="text-[8px]" style={{ color:"var(--text-3)" }}>+{dc.length-3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Citas del día seleccionado ── */}
        <div className="dm-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-label mb-1">Citas del día</p>
              <h2 style={{ fontFamily:"var(--font-cormorant)", fontSize:"1.1rem", fontWeight:500, color:"var(--text)" }}>
                {isToday(diaSeleccionado) ? "Hoy · " : ""}{format(diaSeleccionado, "d 'de' MMMM", { locale: es })}
              </h2>
            </div>
            <span className="text-sm font-bold px-2.5 py-1 rounded-full" style={{ background: citasSeleccionadas.length > 0 ? "rgba(6,182,212,0.1)" : "rgba(255,255,255,0.05)", color: citasSeleccionadas.length > 0 ? "var(--cyan)" : "var(--text-3)", border: `1px solid ${citasSeleccionadas.length > 0 ? "rgba(6,182,212,0.3)" : "var(--border)"}` }}>
              {citasSeleccionadas.length} {citasSeleccionadas.length === 1 ? "cita" : "citas"}
            </span>
          </div>

          {citasSeleccionadas.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8">
              <CalendarDays className="w-8 h-8 mx-auto mb-2" style={{ color:"var(--text-3)" }} />
              <p className="text-sm mb-3" style={{ color:"var(--text-3)" }}>Sin citas este día</p>
              <button onClick={() => { setForm({ ...BLANK_FORM, fecha: format(diaSeleccionado, "yyyy-MM-dd") }); setModal(true); }}
                className="text-sm px-3 py-1.5 rounded-lg" style={{ background:"rgba(6,182,212,0.1)", color:"var(--cyan)", border:"1px solid rgba(6,182,212,0.2)" }}>
                + Agregar cita
              </button>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto">
              {citasSeleccionadas.map(c => {
                const ec = ESTADO_COLOR[c.estado] ?? ESTADO_COLOR.pendiente;
                const svcLabel = c.servicio ? (SRV[c.servicio] ?? c.servicio) : null;
                const svcColor = c.servicio ? (SRV_COLOR[c.servicio] ?? { bg:"rgba(16,185,129,0.1)", color:"#34D399" }) : null;
                const waClean = (c.paciente_telefono || "").replace(/\D/g, "");
                const waLink = waClean ? `https://wa.me/${waClean.startsWith("57") ? waClean : "57" + waClean}` : null;
                return (
                  <div key={c.id} className="p-3.5 rounded-xl" style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${ec.border}` }}>
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color:"var(--text)" }}>{c.paciente_nombre}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 text-sm" style={{ color:"var(--text-3)" }}>
                            <Clock className="w-3 h-3" />
                            {format(new Date(c.fecha_hora), "HH:mm")} · {c.duracion_min}min
                          </span>
                          {c.paciente_telefono && (
                            <a href={`tel:${c.paciente_telefono}`} className="flex items-center gap-1 text-sm font-medium" style={{ color:"#10B981" }}>
                              <Phone className="w-3 h-3" /> {c.paciente_telefono}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 ml-2">
                        {waLink && (
                          <a href={waLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center w-7 h-7 rounded-lg text-sm active:scale-95 transition-all"
                            style={{ background:"rgba(37,211,102,0.12)", color:"#25D366", border:"1px solid rgba(37,211,102,0.25)", WebkitTapHighlightColor:"transparent" }}>
                            💬
                          </a>
                        )}
                        <button onClick={() => eliminar(c.id)} className="text-sm px-2 py-1 rounded-lg transition-colors" style={{ background:"rgba(239,68,68,0.08)", color:"var(--red)", border:"1px solid rgba(239,68,68,0.2)" }}>✕</button>
                      </div>
                    </div>

                    {/* Servicio */}
                    {svcLabel && svcColor && (
                      <div className="mb-2">
                        <span className="inline-flex items-center gap-1 text-[14px] px-2 py-0.5 rounded-lg font-medium" style={{ background: svcColor.bg, color: svcColor.color }}>
                          <Stethoscope className="w-3 h-3" /> {svcLabel}
                        </span>
                      </div>
                    )}

                    {/* Notas */}
                    {c.notas && (
                      <p className="text-[14px] mb-2 italic px-2 py-1 rounded-lg" style={{ color:"var(--text-2)", background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)" }}>
                        {c.notas}
                      </p>
                    )}

                    {/* Estado actual + botones */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13px] font-bold px-2 py-0.5 rounded-full" style={{ background: ec.bg, color: ec.color, border:`1px solid ${ec.border}` }}>
                        {ESTADO_LABEL[c.estado] ?? c.estado}
                      </span>
                      {ESTADOS.filter(e => e !== c.estado).map(e => {
                        const ecB = ESTADO_COLOR[e];
                        return (
                          <button key={e} onClick={() => cambiarEstado(c.id, e)}
                            className="text-[13px] px-2 py-0.5 rounded-full transition-all"
                            style={{ background:"rgba(255,255,255,0.03)", color:"var(--text-3)", border:"1px solid var(--border)" }}>
                            → {ESTADO_LABEL[e]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Próximas citas del mes ── */}
      {citas.filter(c => new Date(c.fecha_hora) >= new Date() && c.estado !== "cancelada").length > 0 && (
        <div className="dm-card p-5">
          <p className="section-label mb-3">Próximas citas agendadas</p>
          <div className="space-y-1.5">
            {citas.filter(c => new Date(c.fecha_hora) >= new Date() && c.estado !== "cancelada").slice(0,10).map(c => {
              const ec = ESTADO_COLOR[c.estado] ?? ESTADO_COLOR.pendiente;
              const svcLabel = c.servicio ? (SRV[c.servicio] ?? c.servicio) : null;
              const svcColor = c.servicio ? (SRV_COLOR[c.servicio] ?? null) : null;
              const dt = new Date(c.fecha_hora);
              const esHoyC = isToday(dt);
              const waCleanC = (c.paciente_telefono || "").replace(/\D/g, "");
              const waLinkC = waCleanC ? `https://wa.me/${waCleanC.startsWith("57") ? waCleanC : "57" + waCleanC}` : null;
              return (
                <div key={c.id} className="flex items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-white/[0.025] transition-colors cursor-pointer" onClick={() => { setDiaSeleccionado(dt); }}>
                  <div className="text-center shrink-0 w-10">
                    <p className="text-lg font-black" style={{ color: esHoyC ? "#10B981" : "var(--cyan)" }}>{format(dt, "d")}</p>
                    <p className="text-[12px] uppercase" style={{ color:"var(--text-3)" }}>{format(dt, "MMM", { locale: es })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color:"var(--text)" }}>{c.paciente_nombre}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-sm" style={{ color:"var(--text-3)" }}>
                        <Clock className="w-3 h-3 inline mr-0.5" />{format(dt, "HH:mm")} · {c.duracion_min}min
                      </span>
                      {svcLabel && svcColor && (
                        <span className="text-[13px] px-1.5 py-0.5 rounded font-medium" style={{ background: svcColor.bg, color: svcColor.color }}>{svcLabel}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.paciente_telefono && (
                      <a href={`tel:${c.paciente_telefono}`} onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-bold"
                        style={{ background:"rgba(16,185,129,0.1)", color:"#10B981", border:"1px solid rgba(16,185,129,0.2)" }}>
                        <Phone className="w-3 h-3" />
                      </a>
                    )}
                    {waLinkC && (
                      <a href={waLinkC} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-sm active:scale-95 transition-all"
                        style={{ background:"rgba(37,211,102,0.12)", color:"#25D366", border:"1px solid rgba(37,211,102,0.25)", WebkitTapHighlightColor:"transparent" }}>
                        💬
                      </a>
                    )}
                    <span className="text-[13px] font-bold px-2 py-0.5 rounded-full" style={{ background: ec.bg, color: ec.color, border:`1px solid ${ec.border}` }}>
                      {ESTADO_LABEL[c.estado]}
                    </span>
                    {esHoyC && <span className="text-[12px] font-black px-1.5 py-0.5 rounded" style={{ background:"rgba(16,185,129,0.15)", color:"#10B981" }}>HOY</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal nueva/editar cita ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.8)" }} onClick={() => setModal(false)}>
          <div className="dm-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ fontFamily:"var(--font-cormorant)", fontSize:"1.2rem", fontWeight:500, color:"var(--text)" }}>
                {editando ? "Editar cita" : "Nueva cita"}
              </h2>
              <button onClick={() => setModal(false)} style={{ color:"var(--text-3)" }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="section-label block mb-1">Nombre del paciente *</label>
                <input value={form.paciente_nombre} onChange={e => setForm(f => ({...f, paciente_nombre: e.target.value}))}
                  placeholder="Ej: Juan Pérez" className="w-full px-3 py-2.5 text-sm rounded-xl"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", color:"var(--text)" }} />
              </div>
              <div>
                <label className="section-label block mb-1">Teléfono</label>
                <input value={form.paciente_telefono} onChange={e => setForm(f => ({...f, paciente_telefono: e.target.value}))}
                  placeholder="+57 310 559 0090" className="w-full px-3 py-2.5 text-sm rounded-xl"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", color:"var(--text)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label block mb-1">Fecha *</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(f => ({...f, fecha: e.target.value}))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl"
                    style={{ background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", color:"var(--text)" }} />
                </div>
                <div>
                  <label className="section-label block mb-1">Hora *</label>
                  <input type="time" value={form.hora} onChange={e => setForm(f => ({...f, hora: e.target.value}))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl"
                    style={{ background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", color:"var(--text)" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label block mb-1">Servicio</label>
                  <select value={form.servicio} onChange={e => setForm(f => ({...f, servicio: e.target.value}))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl"
                    style={{ background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", color:"var(--text)" }}>
                    {Object.entries(SRV).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="section-label block mb-1">Duración (min)</label>
                  <input type="number" value={form.duracion_min} onChange={e => setForm(f => ({...f, duracion_min: Number(e.target.value)}))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl"
                    style={{ background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", color:"var(--text)" }} />
                </div>
              </div>
              <div>
                <label className="section-label block mb-1">Estado</label>
                <select value={form.estado} onChange={e => setForm(f => ({...f, estado: e.target.value}))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", color:"var(--text)" }}>
                  {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
                </select>
              </div>
              <div>
                <label className="section-label block mb-1">Notas</label>
                <textarea rows={2} value={form.notas} onChange={e => setForm(f => ({...f, notas: e.target.value}))}
                  placeholder="Observaciones de la cita..." className="w-full px-3 py-2.5 text-sm rounded-xl resize-none"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", color:"var(--text)" }} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ background:"rgba(255,255,255,0.05)", color:"var(--text-2)", border:"1px solid var(--border)" }}>Cancelar</button>
              <button onClick={guardar} disabled={saving || !form.paciente_nombre || !form.fecha || !form.hora}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background:"var(--cyan)", color:"#000" }}>
                {saving ? "Guardando..." : editando ? "Actualizar" : "Crear cita"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
