"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Users, Search, Star, Shield, UserCheck, UserPlus } from "lucide-react";

interface Paciente {
  id: string;
  alias: string;
  estado: string;
  origen: string;
  calificado: boolean;
  perfil_paciente: Record<string, unknown>;
  created_at: string;
}

const estadoBadge: Record<string, { bg: string; text: string; dot: string }> = {
  nuevo:     { bg: "bg-sky-500/10",     text: "text-sky-400",     dot: "bg-sky-400" },
  activo:    { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  inactivo:  { bg: "bg-white/5",        text: "text-white/40",    dot: "bg-white/30" },
  vip:       { bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-400" },
  bloqueado: { bg: "bg-rose-500/10",    text: "text-rose-400",    dot: "bg-rose-400" },
};

const origenConfig: Record<string, { icon: string; color: string }> = {
  whatsapp:  { icon: "📱", color: "text-emerald-400" },
  instagram: { icon: "📸", color: "text-pink-400" },
  referido:  { icon: "🤝", color: "text-sky-400" },
  otro:      { icon: "🔗", color: "text-white/40" },
};

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
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
    (p.alias.toLowerCase().includes(busqueda.toLowerCase()) ||
     p.estado.toLowerCase().includes(busqueda.toLowerCase())) &&
    (filtroEstado === "Todos" || p.estado === filtroEstado)
  );

  const totalVip = pacientes.filter(p => p.estado === "vip").length;
  const totalActivos = pacientes.filter(p => p.estado === "activo").length;
  const totalNuevos = pacientes.filter(p => p.estado === "nuevo").length;
  const totalCalificados = pacientes.filter(p => p.calificado).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-teal-400" />
            <span className="text-[11px] font-semibold text-teal-400/70 uppercase tracking-[0.15em]">Base de pacientes</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Pacientes</h1>
          <p className="text-white/40 text-sm mt-1">{pacientes.length} registros totales</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        {[
          { label: "VIP", value: totalVip, icon: Star, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/15" },
          { label: "Activos", value: totalActivos, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/15" },
          { label: "Nuevos", value: totalNuevos, icon: UserPlus, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/15" },
          { label: "Calificados", value: totalCalificados, icon: Shield, color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/15" },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`flex items-center gap-3 p-3.5 rounded-xl ${bg} border ${border}`}>
            <Icon className={`w-4 h-4 ${color}`} />
            <div>
              <p className={`text-lg font-extrabold ${color}`}>{value}</p>
              <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Estado filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            placeholder="Buscar por alias o estado..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/30 focus:bg-white/[0.05] transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["Todos", "activo", "nuevo", "vip", "inactivo", "bloqueado"].map(f => (
            <button key={f} onClick={() => setFiltroEstado(f)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all capitalize
                ${filtroEstado === f
                  ? "bg-teal-500/15 text-teal-400 border-teal-500/20"
                  : "bg-white/[0.02] text-white/40 border-white/5 hover:border-white/10 hover:text-white/60"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {["Paciente", "Canal", "Estado", "Score", "Calificado", "Intereses", "Registrado"].map(h => (
                    <th key={h} className="text-left px-5 py-4 text-[10px] font-semibold text-white/25 uppercase tracking-[0.15em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filtrados.map((p, i) => {
                  const badge = estadoBadge[p.estado] ?? estadoBadge.nuevo;
                  const origen = origenConfig[p.origen] ?? origenConfig.otro;
                  const score = (p.perfil_paciente as any)?.score || 0;
                  
                  // Score color logic
                  const scoreColor = 
                    score >= 70 ? "text-emerald-400" :
                    score >= 40 ? "text-amber-400" :
                    "text-rose-400";

                  return (
                    <tr key={p.id} className="table-row-hover group" style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500/10 to-cyan-500/5 flex items-center justify-center border border-white/5 shrink-0">
                            <span className="text-teal-400/70 font-bold text-xs">{p.alias.slice(0, 2).toUpperCase()}</span>
                          </div>
                          <div>
                            <span className="font-bold text-white/80 group-hover:text-white transition-colors">{p.alias}</span>
                            {p.estado === "vip" && <Star className="w-3 h-3 text-amber-400 inline ml-1.5" />}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs ${origen.color} flex items-center gap-1.5`}>
                          {origen.icon} {p.origen}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`flex items-center gap-1.5 w-fit text-[11px] px-2.5 py-1 rounded-full font-semibold ${badge.bg} ${badge.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {p.estado}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-bold ${scoreColor}`}>{score}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {p.calificado ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                            <Shield className="w-3 h-3" /> Sí
                          </span>
                        ) : (
                          <span className="text-xs text-white/20">No</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-white/25 text-xs max-w-[160px] truncate">
                        {((p.perfil_paciente?.intereses as string[]) || []).join(", ") || "—"}
                      </td>
                      <td className="px-5 py-4 text-white/25 text-xs">
                        {format(new Date(p.created_at), "d MMM yyyy", { locale: es })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3 stagger-children">
            {filtrados.map(p => {
              const badge = estadoBadge[p.estado] ?? estadoBadge.nuevo;
              const origen = origenConfig[p.origen] ?? origenConfig.otro;
              return (
                <div key={p.id} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500/10 to-cyan-500/5 flex items-center justify-center border border-white/5">
                        <span className="text-teal-400/70 font-bold text-xs">{p.alias.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <span className="font-bold text-white/80">{p.alias} {p.estado === "vip" && "★"}</span>
                    </div>
                    <span className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold ${badge.bg} ${badge.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {p.estado}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-white/30">
                    <span className={origen.color}>{origen.icon} {p.origen}</span>
                    <span className={p.calificado ? "text-emerald-400 font-medium" : ""}>
                      {p.calificado ? "✓ Calificado" : "Sin calificar"}
                    </span>
                    <span>{format(new Date(p.created_at), "d MMM yyyy", { locale: es })}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {filtrados.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4 border border-white/5">
                <Users className="w-7 h-7 text-white/15" />
              </div>
              <p className="text-white/30 font-medium">No se encontraron pacientes</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
