"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, X, RefreshCw } from "lucide-react";

interface Cita {
  id: string; paciente_nombre: string; paciente_telefono: string | null;
  servicio: string | null; fecha_hora: string; duracion_min: number;
  estado: string; notas: string | null;
}

const SRV: Record<string, string> = { ortodoncia_invisible: "Ortodoncia invisible", diseno_sonrisa: "Diseño de sonrisa", general: "Odontología general", valoracion: "Valoración" };
const ESTADO_COLOR: Record<string, string> = {
  pendiente: "badge-amber", confirmada: "badge-cyan", completada: "badge-green",
  cancelada: "badge-red", no_asistio: "badge-gray"
};
const ESTADOS = ["pendiente","confirmada","completada","cancelada","no_asistio"];

const BLANK_FORM = { paciente_nombre: "", paciente_telefono: "", servicio: "valoracion", fecha: "", hora: "", duracion_min: 60, estado: "pendiente", notas: "" };

export default function AgendaPage() {
  const [mes, setMes] = useState(new Date());
  const [citas, setCitas] = useState<Cita[]>([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date>(new Date());
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  const load = useCallback(async () => {
    const ini = format(startOfMonth(mes), "yyyy-MM-dd");
    const fin = format(endOfMonth(mes), "yyyy-MM-dd");
    const { data } = await supabase.from("agenda_citas")
      .select("*").gte("fecha_hora", ini + "T00:00:00").lte("fecha_hora", fin + "T23:59:59")
      .order("fecha_hora");
    setCitas((data || []) as Cita[]);
  }, [mes]);

  useEffect(() => { load(); }, [load]);

  // Días del calendario
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

  const abrirEditar = (c: Cita) => {
    const dt = new Date(c.fecha_hora);
    setForm({ paciente_nombre: c.paciente_nombre, paciente_telefono: c.paciente_telefono || "", servicio: c.servicio || "valoracion", fecha: format(dt, "yyyy-MM-dd"), hora: format(dt, "HH:mm"), duracion_min: c.duracion_min, estado: c.estado, notas: c.notas || "" });
    setEditando(c.id); setModal(true);
  };

  const DIAS_SEMANA = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Gestión de tiempo</p>
          <h1 style={{ fontFamily:"var(--font-cormorant)", fontSize:"2rem", fontWeight:500, color:"var(--text)" }}>Agenda de citas</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-3)" }}>{citas.length} citas este mes</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Calendario ── */}
        <div className="xl:col-span-2 dm-card p-5">
          {/* Header mes */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMes(subMonths(mes, 1))} className="p-2 rounded-lg hover:bg-white/5 transition-colors"><ChevronLeft className="w-4 h-4" style={{ color:"var(--text-2)" }} /></button>
            <h2 className="font-bold capitalize text-sm" style={{ color:"var(--text)", fontFamily:"var(--font-cormorant)", fontSize:"1.1rem" }}>
              {format(mes, "MMMM yyyy", { locale: es })}
            </h2>
            <button onClick={() => setMes(addMonths(mes, 1))} className="p-2 rounded-lg hover:bg-white/5 transition-colors"><ChevronRight className="w-4 h-4" style={{ color:"var(--text-2)" }} /></button>
          </div>

          {/* Grid semana */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DIAS_SEMANA.map(d => <div key={d} className="text-center section-label py-1">{d}</div>)}
          </div>

          {/* Grid días */}
          <div className="grid grid-cols-7 gap-1">
            {dias.map(dia => {
              const esMismoMes = dia.getMonth() === mes.getMonth();
              const tieneC = citasDia(dia).length > 0;
              const esHoy = isToday(dia);
              const esSeleccionado = isSameDay(dia, diaSeleccionado);
              return (
                <button key={dia.toISOString()} onClick={() => setDiaSeleccionado(dia)}
                  className="relative flex flex-col items-center justify-start p-1.5 rounded-xl min-h-[48px] transition-all text-sm font-medium"
                  style={{
                    background: esSeleccionado ? "rgba(6,182,212,0.15)" : esHoy ? "rgba(255,255,255,0.06)" : "transparent",
                    color: !esMismoMes ? "var(--text-3)" : esSeleccionado ? "var(--cyan)" : esHoy ? "#FFF" : "var(--text-2)",
                    border: esSeleccionado ? "1px solid rgba(6,182,212,0.3)" : "1px solid transparent",
                  }}>
                  <span>{dia.getDate()}</span>
                  {tieneC && esMismoMes && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {citasDia(dia).slice(0,3).map((c, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full"
                          style={{ background: c.estado === "confirmada" ? "var(--cyan)" : c.estado === "completada" ? "var(--green)" : c.estado === "cancelada" ? "var(--red)" : "var(--amber)" }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Citas del día ── */}
        <div className="dm-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-label mb-1">Citas del día</p>
              <h2 style={{ fontFamily:"var(--font-cormorant)", fontSize:"1.1rem", fontWeight:500, color:"var(--text)" }}>
                {format(diaSeleccionado, "d 'de' MMMM", { locale: es })}
              </h2>
            </div>
            <span className="badge badge-cyan">{citasSeleccionadas.length}</span>
          </div>

          {citasSeleccionadas.length === 0 ? (
            <div className="text-center py-10">
              <CalendarDays className="w-8 h-8 mx-auto mb-2" style={{ color:"var(--text-3)" }} />
              <p className="text-sm" style={{ color:"var(--text-3)" }}>Sin citas este día</p>
              <button onClick={() => { setForm({ ...BLANK_FORM, fecha: format(diaSeleccionado, "yyyy-MM-dd") }); setModal(true); }}
                className="mt-3 text-xs px-3 py-1.5 rounded-lg" style={{ background:"rgba(6,182,212,0.1)", color:"var(--cyan)", border:"1px solid rgba(6,182,212,0.2)" }}>
                + Agregar cita
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {citasSeleccionadas.map(c => (
                <div key={c.id} className="p-3.5 rounded-xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)" }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold" style={{ color:"var(--text)" }}>{c.paciente_nombre}</p>
                      <p className="text-xs" style={{ color:"var(--text-3)" }}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {format(new Date(c.fecha_hora), "HH:mm")} · {c.duracion_min}min
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => abrirEditar(c)} className="text-xs px-2 py-1 rounded-lg" style={{ background:"rgba(255,255,255,0.05)", color:"var(--text-3)" }}>✏️</button>
                      <button onClick={() => eliminar(c.id)} className="text-xs px-2 py-1 rounded-lg" style={{ background:"rgba(239,68,68,0.08)", color:"var(--red)" }}>✕</button>
                    </div>
                  </div>
                  {c.servicio && <p className="text-[11px] mb-2" style={{ color:"var(--text-2)" }}>{SRV[c.servicio] ?? c.servicio}</p>}
                  <div className="flex gap-1 flex-wrap">
                    {ESTADOS.map(e => (
                      <button key={e} onClick={() => cambiarEstado(c.id, e)}
                        className="text-[10px] px-2 py-0.5 rounded-full transition-all capitalize"
                        style={{ background: c.estado === e ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.04)", color: c.estado === e ? "var(--cyan)" : "var(--text-3)", border: `1px solid ${c.estado === e ? "rgba(6,182,212,0.3)" : "transparent"}` }}>
                        {e.replace("_"," ")}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Próximas citas ── */}
      {citas.filter(c => new Date(c.fecha_hora) >= new Date() && c.estado !== "cancelada").length > 0 && (
        <div className="dm-card p-5">
          <p className="section-label mb-3">Próximas citas del mes</p>
          <div className="space-y-2">
            {citas.filter(c => new Date(c.fecha_hora) >= new Date() && c.estado !== "cancelada").slice(0,8).map(c => (
              <div key={c.id} className="flex items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-white/[0.025] transition-colors">
                <div className="text-center shrink-0 w-10">
                  <p className="text-lg font-black" style={{ color:"var(--cyan)" }}>{format(new Date(c.fecha_hora), "d")}</p>
                  <p className="text-[9px] uppercase" style={{ color:"var(--text-3)" }}>{format(new Date(c.fecha_hora), "MMM", { locale: es })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color:"var(--text)" }}>{c.paciente_nombre}</p>
                  <p className="text-xs" style={{ color:"var(--text-3)" }}>{format(new Date(c.fecha_hora), "HH:mm")} · {c.servicio ? (SRV[c.servicio] ?? c.servicio) : "Cita"}</p>
                </div>
                <span className={`badge ${ESTADO_COLOR[c.estado] ?? "badge-gray"}`}>{c.estado}</span>
              </div>
            ))}
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
                  {ESTADOS.map(e => <option key={e} value={e}>{e.replace("_"," ")}</option>)}
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
