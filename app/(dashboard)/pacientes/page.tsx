"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Users, Search, RefreshCw } from "lucide-react";

interface Paciente {
  id: string; alias: string; estado: string; origen: string;
  calificado: boolean; perfil_paciente: Record<string, unknown>; created_at: string; updated_at: string;
}

const servicioLabel: Record<string, string> = { ortodoncia: "Ortodoncia", diseno: "Diseño de sonrisa", general: "Odontología general" };
const nivelLabel: Record<string, string> = { alto: "Alto", medio: "Medio", bajo: "Bajo" };

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("pacientes")
      .select("id,alias,estado,origen,calificado,perfil_paciente,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    setPacientes((data || []) as Paciente[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtrados = pacientes.filter(p => {
    const matchBusqueda = !busqueda || p.alias.toLowerCase().includes(busqueda.toLowerCase());
    const estadoConv = (p.perfil_paciente?.estado_conv as string) || "nuevo";
    const matchFiltro = filtroEstado === "todos" || (filtroEstado === "calificados" && p.calificado) || (filtroEstado === "calientes" && parseInt(String(p.perfil_paciente?.score ?? "0")) >= 60) || estadoConv === filtroEstado;
    return matchBusqueda && matchFiltro;
  });

  const getScore = (p: Paciente) => parseInt(String(p.perfil_paciente?.score ?? "0")) || 0;
  const getEstadoConv = (p: Paciente) => (p.perfil_paciente?.estado_conv as string) || "nuevo";
  const getServicio = (p: Paciente) => (p.perfil_paciente?.servicio_interes as string) || null;
  const getNivel = (p: Paciente) => (p.perfil_paciente?.nivel_interes as string) || "bajo";
  const getUA = (p: Paciente) => { const ua = p.perfil_paciente?.ultima_actividad_at as string; return ua ? new Date(ua) : new Date(p.updated_at); };

  const total = pacientes.length;
  const calificados = pacientes.filter(p => p.calificado).length;
  const calientes = pacientes.filter(p => getScore(p) >= 60).length;
  const listos = pacientes.filter(p => getEstadoConv(p) === "entrega_premium").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-3">Base de datos</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.9rem", fontWeight: 300 }}>
            Pacientes
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{total} registros totales</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-sm transition-colors" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
          <RefreshCw className="w-3 h-3" /> Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: total },
          { label: "Calificados", value: calificados },
          { label: "Score ≥ 60", value: calientes },
          { label: "Listos para llamada", value: listos },
        ].map(({ label, value }) => (
          <div key={label} className="dm-card p-4">
            <p className="text-2xl font-semibold text-white">{value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Búsqueda + Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="Buscar por alias..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none transition-all rounded-sm"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "todos", label: "Todos" },
            { key: "calificados", label: "Calificados" },
            { key: "calientes", label: "Score alto" },
            { key: "entrega_premium", label: "Listos" },
            { key: "nuevo", label: "Nuevos" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltroEstado(key)}
              className="px-3 py-2 text-xs font-medium rounded-sm transition-all"
              style={{ background: filtroEstado === key ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.02)", color: filtroEstado === key ? "#FFF" : "var(--text-secondary)", border: "1px solid", borderColor: filtroEstado === key ? "rgba(255,255,255,0.2)" : "var(--border)" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border border-white/20 border-t-white rounded-full animate-spin" /></div>
      ) : (
        <div className="dm-card overflow-hidden">
          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Alias", "Canal", "Estado conv.", "Servicio", "Nivel", "Score", "Calificado", "Última actividad"].map(h => (
                    <th key={h} className="text-left px-5 py-4 section-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => {
                  const score = getScore(p); const estadoConv = getEstadoConv(p); const servicio = getServicio(p);
                  const nivel = getNivel(p); const ua = getUA(p); const origen = p.origen || "otro";
                  return (
                    <tr key={p.id} className="table-row-hover" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
                            {p.alias.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-white">{p.alias}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><span className="text-xs capitalize" style={{ color: "var(--text-secondary)" }}>{origen}</span></td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2 py-1 rounded-sm" style={{ background: "rgba(255,255,255,0.04)", color: estadoConv === "entrega_premium" ? "#FFF" : "var(--text-secondary)", border: "1px solid", borderColor: estadoConv === "entrega_premium" ? "rgba(255,255,255,0.15)" : "transparent" }}>
                          {estadoConv}
                        </span>
                      </td>
                      <td className="px-5 py-3.5" style={{ color: "var(--text-secondary)" }}>{servicio ? (servicioLabel[servicio] ?? servicio) : "—"}</td>
                      <td className="px-5 py-3.5" style={{ color: nivel === "alto" ? "#FFF" : nivel === "medio" ? "rgba(255,255,255,0.5)" : "var(--text-muted)" }}>{nivelLabel[nivel] ?? nivel}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm ${score >= 60 ? "text-white" : score >= 30 ? "text-white/60" : "text-white/30"}`}>{score}</span>
                          <div className="score-bar w-12"><div className="score-bar-fill" style={{ width: `${score}%` }} /></div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><span className={`text-xs ${p.calificado ? "text-white" : "text-white/30"}`}>{p.calificado ? "✓ Sí" : "—"}</span></td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-muted)" }}>{formatDistanceToNow(ua, { locale: es, addSuffix: true })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtrados.length === 0 && <p className="text-sm text-center py-10" style={{ color: "var(--text-muted)" }}>No se encontraron pacientes</p>}
          </div>

          {/* Mobile */}
          <div className="sm:hidden divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {filtrados.map(p => {
              const score = getScore(p); const estadoConv = getEstadoConv(p); const servicio = getServicio(p); const ua = getUA(p);
              return (
                <div key={p.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>{p.alias.slice(0, 2).toUpperCase()}</div>
                      <span className="font-medium text-white text-sm">{p.alias}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: score >= 60 ? "#FFF" : "var(--text-muted)" }}>{score}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span>{estadoConv}</span>
                    {servicio && <span>{servicioLabel[servicio] ?? servicio}</span>}
                    {p.calificado && <span className="text-white">✓ Calificado</span>}
                    <span style={{ color: "var(--text-muted)" }}>{formatDistanceToNow(ua, { locale: es, addSuffix: true })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
