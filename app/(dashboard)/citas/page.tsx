"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { Phone, Search, RefreshCw, Clock } from "lucide-react";

interface Lead {
  id: string; alias: string; perfil_paciente: Record<string, unknown>;
  calificado: boolean; updated_at: string; created_at: string;
}

const servicioLabel: Record<string, string> = { ortodoncia: "Ortodoncia", diseno: "Diseño de sonrisa", general: "Odontología general" };

export default function CitasPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("pacientes")
      .select("id,alias,perfil_paciente,calificado,updated_at,created_at")
      .eq("estado", "activo")
      .order("updated_at", { ascending: false })
      .limit(100);
    setLeads((data || []) as Lead[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getScore = (p: Lead) => parseInt(String(p.perfil_paciente?.score ?? "0")) || 0;
  const getEstadoConv = (p: Lead) => (p.perfil_paciente?.estado_conv as string) || "nuevo";
  const getServicio = (p: Lead) => (p.perfil_paciente?.servicio_interes as string) || null;
  const getNombre = (p: Lead) => (p.perfil_paciente?.nombre as string) || null;
  const getCiudad = (p: Lead) => (p.perfil_paciente?.ciudad as string) || null;
  const getHorario = (p: Lead) => (p.perfil_paciente?.horario_contacto as string) || null;
  const getUA = (p: Lead) => { const ua = p.perfil_paciente?.ultima_actividad_at as string; return ua ? new Date(ua) : new Date(p.updated_at); };

  const filtrados = leads.filter(p => {
    const estadoConv = getEstadoConv(p);
    const score = getScore(p);
    const nombre = getNombre(p) || p.alias;
    const matchBusqueda = !busqueda || nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.alias.toLowerCase().includes(busqueda.toLowerCase());
    const matchFiltro = filtro === "todos"
      || (filtro === "listos" && estadoConv === "entrega_premium")
      || (filtro === "calificados" && p.calificado)
      || (filtro === "calientes" && score >= 60)
      || (filtro === "pendientes" && estadoConv !== "entrega_premium" && score >= 20);
    return matchBusqueda && matchFiltro;
  });

  const listos = leads.filter(p => getEstadoConv(p) === "entrega_premium").length;
  const calificados = leads.filter(p => p.calificado).length;
  const calientes = leads.filter(p => getScore(p) >= 60).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-3">Gestión comercial</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.9rem", fontWeight: 300 }}>Leads para llamada</h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Pacientes listos para contactar</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-sm" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
          <RefreshCw className="w-3 h-3" /> Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Listos para llamada", value: listos },
          { label: "Calificados", value: calificados },
          { label: "Score ≥ 60", value: calientes },
        ].map(({ label, value }) => (
          <div key={label} className="dm-card p-4">
            <p className="text-2xl font-semibold text-white">{value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros + Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="Buscar por nombre o alias..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none rounded-sm"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }} />
        </div>
        <div className="flex gap-2">
          {[
            { key: "todos", label: "Todos" },
            { key: "listos", label: "Listos" },
            { key: "calientes", label: "Calientes" },
            { key: "calificados", label: "Calificados" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltro(key)} className="px-3 py-2 text-xs font-medium rounded-sm transition-all"
              style={{ background: filtro === key ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.02)", color: filtro === key ? "#FFF" : "var(--text-secondary)", border: "1px solid", borderColor: filtro === key ? "rgba(255,255,255,0.2)" : "var(--border)" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border border-white/20 border-t-white rounded-full animate-spin" /></div>
      ) : filtrados.length === 0 ? (
        <div className="dm-card p-12 text-center">
          <Phone className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No hay leads en esta categoría</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Los leads aparecerán cuando los pacientes avancen en la conversación</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map(p => {
            const score = getScore(p); const estadoConv = getEstadoConv(p); const servicio = getServicio(p);
            const nombre = getNombre(p); const ciudad = getCiudad(p); const horario = getHorario(p); const ua = getUA(p);
            const esListo = estadoConv === "entrega_premium";
            return (
              <div key={p.id} className="dm-card p-5" style={esListo ? { borderColor: "rgba(255,255,255,0.15)" } : {}}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-sm flex items-center justify-center text-sm font-bold" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
                      {p.alias.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{nombre || p.alias}</p>
                      {nombre && <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{p.alias}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${score >= 60 ? "text-white" : "text-white/40"}`}>{score}</p>
                    <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>score</p>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  {servicio && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <span className="w-1 h-1 bg-white/40 rounded-full" />
                      {servicioLabel[servicio] ?? servicio}
                    </div>
                  )}
                  {ciudad && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <span className="w-1 h-1 bg-white/40 rounded-full" />
                      {ciudad}
                    </div>
                  )}
                  {horario && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <Clock className="w-3 h-3" />
                      {horario}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-1 rounded-sm" style={{ background: esListo ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)", color: esListo ? "#FFF" : "var(--text-secondary)", border: `1px solid ${esListo ? "rgba(255,255,255,0.2)" : "var(--border)"}` }}>
                    {esListo ? "✓ Listo para llamada" : estadoConv}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {formatDistanceToNow(ua, { locale: es, addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
        {filtrados.length} leads · Actualización automática cada 30 segundos
      </p>
    </div>
  );
}
