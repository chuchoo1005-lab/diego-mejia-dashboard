"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Phone, Search, RefreshCw, Clock, MapPin, Stethoscope } from "lucide-react";

interface Paciente {
  id: string; alias: string; calificado: boolean;
  telefono_encriptado: string | null;
  perfil_paciente: Record<string, unknown>; updated_at: string;
}

const SRV: Record<string, string> = { ortodoncia: "Ortodoncia", diseno: "Diseño de sonrisa", general: "Odontología general" };

function formatTel(t: string | null): string {
  if (!t) return "";
  const c = t.replace(/\D/g, "");
  if (c.length >= 10 && c.startsWith("57")) return `+57 ${c.slice(2, 5)} ${c.slice(5, 8)} ${c.slice(8)}`;
  if (c.length === 10) return `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6)}`;
  return t;
}
function displayName(p: Paciente): string {
  return (p.perfil_paciente?.nombre as string) || formatTel(p.telefono_encriptado) || p.alias;
}
function sc(p: Paciente) { return parseInt(String(p.perfil_paciente?.score ?? "0")) || 0; }
function ec(p: Paciente) { return (p.perfil_paciente?.estado_conv as string) || "nuevo"; }
function ua(p: Paciente) { const v = p.perfil_paciente?.ultima_actividad_at as string; return v ? new Date(v) : new Date(p.updated_at); }

export default function CitasPage() {
  const [leads, setLeads] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("pacientes")
      .select("id,alias,calificado,telefono_encriptado,perfil_paciente,updated_at")
      .eq("estado", "activo").order("updated_at", { ascending: false }).limit(100);
    setLeads((data || []) as Paciente[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const filtrados = leads.filter(p => {
    const nom = displayName(p); const tel = formatTel(p.telefono_encriptado);
    const match = !busqueda || nom.toLowerCase().includes(busqueda.toLowerCase()) || tel.includes(busqueda);
    const estado = ec(p); const score = sc(p);
    const f = filtro === "todos" ? true
      : filtro === "listos" ? estado === "entrega_premium"
      : filtro === "calificados" ? p.calificado
      : filtro === "calientes" ? score >= 60
      : true;
    return match && f;
  });

  const stats = {
    listos: leads.filter(p => ec(p) === "entrega_premium").length,
    calif: leads.filter(p => p.calificado).length,
    calientes: leads.filter(p => sc(p) >= 60).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Gestión comercial</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)" }}>
            Leads para llamar
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Pacientes listos para contactar</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Listos para llamar", value: stats.listos, color: "text-emerald-600" },
          { label: "Calificados", value: stats.calif, color: "text-blue-600" },
          { label: "Score ≥ 60", value: stats.calientes, color: "text-orange-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="dm-card p-4">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Búsqueda + filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="Buscar por nombre o teléfono..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }} />
        </div>
        <div className="flex gap-2">
          {[
            { key: "todos", label: "Todos" }, { key: "listos", label: "Listos" },
            { key: "calientes", label: "Calientes" }, { key: "calificados", label: "Calificados" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltro(key)} className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
              style={{ background: filtro === key ? "#111827" : "var(--card)", color: filtro === key ? "#FFF" : "var(--text-secondary)", border: "1px solid", borderColor: filtro === key ? "#111827" : "var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" /></div>
      ) : filtrados.length === 0 ? (
        <div className="dm-card p-14 text-center">
          <Phone className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="font-medium" style={{ color: "var(--text-secondary)" }}>No hay leads en esta categoría</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Los leads aparecen cuando los pacientes avanzan en la conversación</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map(p => {
            const score = sc(p); const estado = ec(p); const act = ua(p);
            const nom = displayName(p); const tel = formatTel(p.telefono_encriptado);
            const nombre = p.perfil_paciente?.nombre as string;
            const ciudad = p.perfil_paciente?.ciudad as string;
            const horario = p.perfil_paciente?.horario_contacto as string;
            const servicio = p.perfil_paciente?.servicio_interes as string;
            const isListo = estado === "entrega_premium";
            return (
              <div key={p.id} className="dm-card p-5" style={isListo ? { borderColor: "#10B981", borderWidth: "2px" } : {}}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{ background: isListo ? "#D1FAE5" : "#F4F4F6", color: isListo ? "#065F46" : "#6B7280" }}>
                      {nom.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{nombre || nom}</p>
                      {nombre && tel && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{tel}</p>}
                      {!nombre && <p className="text-[10px] mt-0.5" style={{ color: "#D1D5DB" }}>{p.alias}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold" style={{ color: score >= 60 ? "#111827" : "#D1D5DB" }}>{score}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>score</p>
                  </div>
                </div>

                {/* Datos */}
                <div className="space-y-2 mb-4">
                  {tel && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
                      <span className="font-medium" style={{ color: "var(--text)" }}>{tel}</span>
                    </div>
                  )}
                  {ciudad && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
                      {ciudad}
                    </div>
                  )}
                  {servicio && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <Stethoscope className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
                      {SRV[servicio] ?? servicio}
                    </div>
                  )}
                  {horario && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
                      {horario}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <span className={`badge ${isListo ? "badge-green" : "badge-gray"}`}>
                    {isListo ? "✓ Listo para llamar" : estado}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatDistanceToNow(act, { locale: es, addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
