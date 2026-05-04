"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Users, Search, RefreshCw } from "lucide-react";

interface Paciente {
  id: string; alias: string; estado: string; origen: string;
  calificado: boolean; telefono_encriptado: string | null;
  perfil_paciente: Record<string, unknown>; created_at: string; updated_at: string;
}

const SRV: Record<string, string> = { ortodoncia: "Ortodoncia", diseno: "Diseño de sonrisa", general: "Odontología general" };
const NIVEL: Record<string, { label: string; cls: string }> = {
  alto:  { label: "Alto",  cls: "badge badge-green" },
  medio: { label: "Medio", cls: "badge badge-yellow" },
  bajo:  { label: "Bajo",  cls: "badge badge-gray" },
};

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
function srv(p: Paciente) { return (p.perfil_paciente?.servicio_interes as string) || null; }
function niv(p: Paciente) { return (p.perfil_paciente?.nivel_interes as string) || "bajo"; }
function ua(p: Paciente) { const v = p.perfil_paciente?.ultima_actividad_at as string; return v ? new Date(v) : new Date(p.updated_at); }

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("pacientes")
      .select("id,alias,estado,origen,calificado,telefono_encriptado,perfil_paciente,created_at,updated_at")
      .order("updated_at", { ascending: false }).limit(100);
    setPacientes((data || []) as Paciente[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtrados = pacientes.filter(p => {
    const nom = displayName(p); const tel = formatTel(p.telefono_encriptado);
    const match = !busqueda || nom.toLowerCase().includes(busqueda.toLowerCase()) || tel.includes(busqueda) || p.alias.toLowerCase().includes(busqueda.toLowerCase());
    const f = filtro === "todos" ? true
      : filtro === "calificados" ? p.calificado
      : filtro === "listos" ? ec(p) === "entrega_premium"
      : filtro === "calientes" ? sc(p) >= 60
      : ec(p) === filtro;
    return match && f;
  });

  const totales = { total: pacientes.length, calif: pacientes.filter(p => p.calificado).length, calientes: pacientes.filter(p => sc(p) >= 60).length, listos: pacientes.filter(p => ec(p) === "entrega_premium").length };

  const FILTROS = [
    { key: "todos", label: "Todos" }, { key: "listos", label: "Listos para llamar" },
    { key: "calificados", label: "Calificados" }, { key: "calientes", label: "Score alto" }, { key: "nuevo", label: "Nuevos" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Base de datos</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)" }}>Pacientes</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{totales.total} registros totales</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: totales.total },
          { label: "Calificados", value: totales.calif },
          { label: "Score ≥ 60", value: totales.calientes },
          { label: "Listos para llamar", value: totales.listos },
        ].map(({ label, value }) => (
          <div key={label} className="dm-card p-4">
            <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Búsqueda + Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="Buscar por nombre, teléfono o código..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTROS.map(({ key, label }) => (
            <button key={key} onClick={() => setFiltro(key)}
              className="px-3.5 py-2 text-sm font-medium rounded-lg transition-all"
              style={{
                background: filtro === key ? "#111827" : "var(--card)",
                color: filtro === key ? "#FFF" : "var(--text-secondary)",
                border: "1px solid", borderColor: filtro === key ? "#111827" : "var(--border)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
              }}>{label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Desktop tabla */}
          <div className="dm-card overflow-hidden hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#FAFAFA", borderBottom: "1px solid var(--border)" }}>
                  {["Nombre / Teléfono", "Canal", "Estado conv.", "Servicio", "Nivel", "Score", "Calificado", "Registro"].map(h => (
                    <th key={h} className="text-left px-5 py-3 section-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => {
                  const score = sc(p); const nivel = niv(p); const serv = srv(p); const estado = ec(p);
                  const nom = displayName(p); const tel = formatTel(p.telefono_encriptado);
                  const isListo = estado === "entrega_premium";
                  const nivelCfg = NIVEL[nivel] ?? NIVEL.bajo;
                  return (
                    <tr key={p.id} className="table-row-hover" style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold" style={{ color: "var(--text)" }}>{nom}</p>
                        {tel && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{tel}</p>}
                        <p className="text-[10px] mt-0.5" style={{ color: "#D1D5DB" }}>{p.alias}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm capitalize" style={{ color: "var(--text-secondary)" }}>{p.origen || "whatsapp"}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`badge ${isListo ? "badge-green" : "badge-gray"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isListo ? "bg-emerald-500" : "bg-gray-400"}`} />
                          {estado}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {serv ? (SRV[serv] ?? serv) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={nivelCfg.cls}>{nivelCfg.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm" style={{ color: score >= 60 ? "#111827" : score >= 30 ? "#6B7280" : "#D1D5DB" }}>{score}</span>
                          <div className="score-bar w-12"><div className="score-bar-fill" style={{ width: `${score}%` }} /></div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-sm font-medium ${p.calificado ? "text-emerald-600" : "text-gray-300"}`}>
                          {p.calificado ? "✓ Sí" : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-muted)" }}>
                        {format(new Date(p.created_at), "d MMM yyyy", { locale: es })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtrados.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No se encontraron pacientes</p>
              </div>
            )}
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtrados.map(p => {
              const score = sc(p); const serv = srv(p); const estado = ec(p);
              const nom = displayName(p); const tel = formatTel(p.telefono_encriptado);
              return (
                <div key={p.id} className="dm-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{nom}</p>
                      {tel && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{tel}</p>}
                    </div>
                    <span className="text-lg font-bold" style={{ color: score >= 60 ? "#111827" : "#D1D5DB" }}>{score}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {serv && <span>{SRV[serv] ?? serv}</span>}
                    <span className={`badge ${estado === "entrega_premium" ? "badge-green" : "badge-gray"}`} style={{ fontSize: "10px" }}>{estado}</span>
                    {p.calificado && <span className="text-emerald-600 font-medium">✓ Calificado</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
