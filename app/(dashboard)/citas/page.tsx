"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";

interface Cita {
  id: string;
  fecha_hora: string;
  estado: string;
  notas_encriptadas: string | null;
  pacientes: { alias: string; estado: string };
  tratamientos: { nombre: string; duracion_minutos: number; precio_cop: number } | null;
}

const estadoBadge: Record<string, string> = {
  confirmada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pendiente:  "bg-amber-50 text-amber-700 border-amber-200",
  completada: "bg-slate-100 text-slate-600 border-slate-200",
  cancelada:  "bg-rose-50 text-rose-700 border-rose-200",
  reagendada: "bg-sky-50 text-sky-700 border-sky-200",
  no_asistio: "bg-orange-50 text-orange-700 border-orange-200",
};

const filters = ["Todas", "confirmada", "pendiente", "completada", "cancelada"];

export default function CitasPage() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [filtro, setFiltro] = useState("Todas");
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

  const formatPrecio = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2740] flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-[#1a2740]" /> Citas
          </h1>
          <p className="text-slate-500 text-sm mt-1">{citas.length} resultado{citas.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all capitalize
              ${filtro === f
                ? "bg-[#1a2740] text-white border-[#1a2740] shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-[#1a2740]/40 hover:text-[#1a2740]"}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#1a2740] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : citas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No hay citas con este filtro</div>
      ) : (
        <div className="space-y-3">
          {citas.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#1a2740]/10 flex items-center justify-center shrink-0">
                    <span className="text-[#1a2740] font-bold text-sm">{c.pacientes?.alias?.slice(0, 3)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[#1a2740]">{c.pacientes?.alias ?? "—"}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${estadoBadge[c.estado] ?? estadoBadge.pendiente}`}>
                        {c.estado}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{c.tratamientos?.nombre ?? "Sin tratamiento asignado"}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(c.fecha_hora), "EEEE d 'de' MMMM · HH:mm 'hs'", { locale: es })}
                      {c.tratamientos && ` · ${c.tratamientos.duracion_minutos} min`}
                    </p>
                  </div>
                </div>
                {c.tratamientos && (
                  <div className="text-right sm:shrink-0">
                    <p className="text-lg font-bold text-[#1a2740]">{formatPrecio(c.tratamientos.precio_cop)}</p>
                    <p className="text-xs text-slate-400">valor estimado</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
