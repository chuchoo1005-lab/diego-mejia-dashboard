"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Users, Search } from "lucide-react";

interface Paciente {
  id: string;
  alias: string;
  estado: string;
  origen: string;
  calificado: boolean;
  perfil_paciente: Record<string, unknown>;
  created_at: string;
}

const estadoBadge: Record<string, string> = {
  nuevo:     "bg-sky-50 text-sky-700 border-sky-200",
  activo:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactivo:  "bg-slate-100 text-slate-600 border-slate-200",
  vip:       "bg-amber-50 text-amber-700 border-amber-200",
  bloqueado: "bg-rose-50 text-rose-700 border-rose-200",
};

const origenIcon: Record<string, string> = {
  whatsapp: "📱",
  instagram: "📸",
  referido: "🤝",
  otro: "🔗",
};

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("pacientes")
        .select("id,alias,estado,origen,calificado,perfil_paciente,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      setPacientes(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtrados = pacientes.filter(p =>
    p.alias.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.estado.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2740] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#1a2740]" /> Pacientes
          </h1>
          <p className="text-slate-500 text-sm mt-1">{pacientes.length} registros totales</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por alias o estado..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#1a2740]/40 shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#1a2740] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Alias", "Canal", "Estado", "Calificado", "Intereses", "Desde"].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-bold text-[#1a2740]">{p.alias}</span>
                      {p.estado === "vip" && <span className="ml-2 text-amber-500">★</span>}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{origenIcon[p.origen]} {p.origen}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${estadoBadge[p.estado]}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold ${p.calificado ? "text-emerald-600" : "text-slate-400"}`}>
                        {p.calificado ? "✓ Sí" : "No"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs max-w-[160px] truncate">
                      {((p.perfil_paciente?.intereses as string[]) || []).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">
                      {format(new Date(p.created_at), "d MMM yyyy", { locale: es })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtrados.map(p => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#1a2740]">{p.alias} {p.estado === "vip" && "★"}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${estadoBadge[p.estado]}`}>{p.estado}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>{origenIcon[p.origen]} {p.origen}</span>
                  <span className={p.calificado ? "text-emerald-600 font-medium" : ""}>{p.calificado ? "✓ Calificado" : "Sin calificar"}</span>
                  <span>{format(new Date(p.created_at), "d MMM yyyy", { locale: es })}</span>
                </div>
              </div>
            ))}
          </div>

          {filtrados.length === 0 && (
            <p className="text-center text-slate-400 py-12">No se encontraron pacientes</p>
          )}
        </>
      )}
    </div>
  );
}
