"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Clock, DollarSign, Filter, Search } from "lucide-react";

interface Cita {
  id: string;
  fecha_hora: string;
  estado: string;
  notas_encriptadas: string | null;
  pacientes: { alias: string; estado: string };
  tratamientos: { nombre: string; duracion_minutos: number; precio_cop: number } | null;
}

const estadoBadge: Record<string, { bg: string; text: string; dot: string }> = {
  confirmada: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  pendiente:  { bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-400" },
  completada: { bg: "bg-white/5",         text: "text-white/40",    dot: "bg-white/30" },
  cancelada:  { bg: "bg-rose-500/10",     text: "text-rose-400",    dot: "bg-rose-400" },
  reagendada: { bg: "bg-sky-500/10",      text: "text-sky-400",     dot: "bg-sky-400" },
  no_asistio: { bg: "bg-orange-500/10",   text: "text-orange-400",  dot: "bg-orange-400" },
};

const filters = ["Todas", "confirmada", "pendiente", "completada", "cancelada"];

export default function CitasPage() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [filtro, setFiltro] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      let q = supabase
        .from("citas")
        .select("id,fecha_hora,estado,notas_encriptadas,pacientes(alias,estado),tratamientos(nombre,duracion_minutos,precio_cop)")
        .order("fecha_hora", { ascending: true });
      if (filtro !== "Todas") q = q.eq("estado", filtro);
      const { data } = await q.limit(50);
      setCitas((data as unknown as Cita[]) || []);
      setLoading(false);
    }
    load();
  }, [filtro]);

  const filtrados = citas.filter(c =>
    !busqueda || c.pacientes?.alias?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const formatPrecio = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

  const totalConfirmadas = citas.filter(c => c.estado === "confirmada").length;
  const totalPendientes = citas.filter(c => c.estado === "pendiente").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-4 h-4 text-teal-400" />
            <span className="text-[11px] font-semibold text-teal-400/70 uppercase tracking-[0.15em]">Agenda dental</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Gestión de Citas</h1>
          <p className="text-white/40 text-sm mt-1">{citas.length} cita{citas.length !== 1 ? "s" : ""} encontrada{citas.length !== 1 ? "s" : ""}</p>
        </div>
        {/* Mini stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
            <span className="text-xs font-semibold text-emerald-400">{totalConfirmadas} confirmadas</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/15">
            <div className="w-2 h-2 bg-amber-400 rounded-full" />
            <span className="text-xs font-semibold text-amber-400">{totalPendientes} pendientes</span>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/30 focus:bg-white/[0.05] transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-white/20 hidden sm:block" />
          {filters.map((f) => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all capitalize
                ${filtro === f
                  ? "bg-teal-500/15 text-teal-400 border-teal-500/20 shadow-lg shadow-teal-500/5"
                  : "bg-white/[0.02] text-white/40 border-white/5 hover:border-white/10 hover:text-white/60"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
          </div>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4 border border-white/5">
            <CalendarDays className="w-7 h-7 text-white/15" />
          </div>
          <p className="text-white/30 font-medium">No hay citas con este filtro</p>
          <p className="text-white/15 text-sm mt-1">Intenta cambiar los filtros de búsqueda</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {filtrados.map((c) => {
            const badge = estadoBadge[c.estado] ?? estadoBadge.pendiente;
            return (
              <div key={c.id} className="glass-card p-5 hover:border-white/10 group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/15 to-cyan-500/10 flex items-center justify-center border border-teal-500/10 shrink-0 group-hover:from-teal-500/20 group-hover:to-cyan-500/15 transition-all">
                      <span className="text-teal-400/80 font-bold text-sm">{c.pacientes?.alias?.slice(0, 2)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <p className="font-bold text-white/90 group-hover:text-white transition-colors">{c.pacientes?.alias ?? "—"}</p>
                        <div className={`flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${badge.bg} ${badge.text}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {c.estado}
                        </div>
                      </div>
                      <p className="text-sm text-white/40 mt-1">{c.tratamientos?.nombre ?? "Sin tratamiento asignado"}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-white/25">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {format(new Date(c.fecha_hora), "EEEE d 'de' MMMM", { locale: es })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(c.fecha_hora), "HH:mm", { locale: es })}
                          {c.tratamientos && ` · ${c.tratamientos.duracion_minutos} min`}
                        </span>
                      </div>
                    </div>
                  </div>
                  {c.tratamientos && (
                    <div className="text-right sm:shrink-0 flex items-center gap-3 sm:flex-col sm:items-end">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-teal-400/50" />
                        <p className="text-lg font-extrabold text-white/80">{formatPrecio(c.tratamientos.precio_cop)}</p>
                      </div>
                      <p className="text-[11px] text-white/20">Valor estimado</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
