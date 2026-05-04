"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquare, Users, CheckCircle, Phone, RefreshCw, TrendingUp, ArrowUpRight } from "lucide-react";

interface Paciente {
  id: string; alias: string; estado: string; calificado: boolean;
  telefono_encriptado: string | null;
  perfil_paciente: Record<string, unknown>; created_at: string; updated_at: string;
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
function score(p: Paciente) { return parseInt(String(p.perfil_paciente?.score ?? "0")) || 0; }
function estadoConv(p: Paciente) { return (p.perfil_paciente?.estado_conv as string) || "nuevo"; }
function servicio(p: Paciente) { return (p.perfil_paciente?.servicio_interes as string) || null; }
function nivel(p: Paciente) { return (p.perfil_paciente?.nivel_interes as string) || "bajo"; }
function ua(p: Paciente) {
  const v = p.perfil_paciente?.ultima_actividad_at as string;
  return v ? new Date(v) : new Date(p.updated_at);
}

function buildSugs(pacs: Paciente[]) {
  const sugs: { tipo: string; nombre: string; tel: string; accion: string; srv: string | null; sc: number }[] = [];
  const now = Date.now();
  pacs.forEach(p => {
    const sc = score(p); const srv = servicio(p); const ec = estadoConv(p);
    const hrs = (now - ua(p).getTime()) / 3600000;
    const ti = p.perfil_paciente?.tipo_intencion as string;
    const nom = displayName(p); const tel = formatTel(p.telefono_encriptado);
    if (ti === "referido") sugs.push({ tipo: "referido", nombre: nom, tel, accion: "Referido nuevo — alta prioridad", srv, sc });
    else if (sc >= 70) sugs.push({ tipo: "caliente", nombre: nom, tel, accion: "Lead caliente — confirmar valoración", srv, sc });
    else if (hrs > 48 && sc >= 20 && ec !== "entrega_premium") sugs.push({ tipo: "seguimiento", nombre: nom, tel, accion: `Sin respuesta ${Math.round(hrs)}h`, srv, sc });
    else if (ec === "nuevo" && hrs < 2) sugs.push({ tipo: "nuevo", nombre: nom, tel, accion: "Lead nuevo — responder pronto", srv, sc });
  });
  return sugs.sort((a, b) => b.sc - a.sc).slice(0, 6);
}

const TIPO_BADGE: Record<string, string> = {
  referido: "badge badge-black", caliente: "badge badge-red",
  seguimiento: "badge badge-yellow", nuevo: "badge badge-blue",
};
const TIPO_LABEL: Record<string, string> = {
  referido: "Referido", caliente: "Caliente", seguimiento: "Seguimiento", nuevo: "Nuevo",
};

export default function Home() {
  const [kpis, setKpis] = useState({ total: 0, hoy: 0, convs: 0, calif: 0, listos: 0 });
  const [pacs, setPacs] = useState<Paciente[]>([]);
  const [sugs, setSugs] = useState<ReturnType<typeof buildSugs>>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const t = today.toISOString();
      const [{ count: total }, { count: hoy }, { count: convs }, { count: calif }, { data }] = await Promise.all([
        supabase.from("pacientes").select("*", { count: "exact", head: true }),
        supabase.from("pacientes").select("*", { count: "exact", head: true }).gte("created_at", t),
        supabase.from("conversaciones").select("*", { count: "exact", head: true }).gte("timestamp", t),
        supabase.from("pacientes").select("*", { count: "exact", head: true }).eq("calificado", true),
        supabase.from("pacientes").select("id,alias,estado,calificado,telefono_encriptado,perfil_paciente,created_at,updated_at").eq("estado", "activo").order("updated_at", { ascending: false }).limit(40),
      ]);
      const d = (data || []) as Paciente[];
      const listos = d.filter(p => estadoConv(p) === "entrega_premium").length;
      setKpis({ total: total ?? 0, hoy: hoy ?? 0, convs: convs ?? 0, calif: calif ?? 0, listos });
      setPacs(d); setSugs(buildSugs(d)); setLastUpdate(new Date());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando panel...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="section-label mb-1.5">Panel de control</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)", lineHeight: 1.1 }}>
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {format(new Date(), "yyyy")} · Actualizado a las {format(lastUpdate, "HH:mm")}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all self-start sm:self-auto"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total pacientes", value: kpis.total, icon: Users, sub: "registrados" },
          { label: "Nuevos hoy", value: kpis.hoy, icon: TrendingUp, sub: "ingresaron hoy" },
          { label: "Mensajes hoy", value: kpis.convs, icon: MessageSquare, sub: "conversaciones" },
          { label: "Calificados", value: kpis.calif, icon: CheckCircle, sub: "con datos completos" },
          { label: "Listos para llamar", value: kpis.listos, icon: Phone, sub: "acción requerida", highlight: true },
        ].map(({ label, value, icon: Icon, sub, highlight }, i) => (
          <div key={label} className="dm-card p-5 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: highlight && value > 0 ? "#111827" : "#F4F4F6" }}>
                <Icon className="w-4 h-4" style={{ color: highlight && value > 0 ? "#FFF" : "#6B7280" }} />
              </div>
              {highlight && value > 0 && (
                <div className="w-2 h-2 rounded-full bg-emerald-500 active-dot" />
              )}
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Sugerencias + Actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Sugerencias IA */}
        <div className="dm-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-label mb-1">Inteligencia artificial</p>
              <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.15rem", fontWeight: 600, color: "var(--text)" }}>
                Acciones recomendadas
              </h2>
            </div>
            <span className="badge badge-gray">{sugs.length} pendientes</span>
          </div>
          {sugs.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin sugerencias activas</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>El sistema monitorea leads en tiempo real</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sugs.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-gray-50"
                  style={{ border: "1px solid var(--border)" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{ background: "#F4F4F6", color: "var(--text-secondary)" }}>
                    {(s.nombre || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{s.nombre}</span>
                      <span className={TIPO_BADGE[s.tipo] ?? "badge badge-gray"}>{TIPO_LABEL[s.tipo] ?? s.tipo}</span>
                    </div>
                    <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{s.accion}</p>
                    {s.tel && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{s.tel}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{s.sc}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>score</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actividad reciente */}
        <div className="dm-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-label mb-1">Actividad reciente</p>
              <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.15rem", fontWeight: 600, color: "var(--text)" }}>
                Pacientes activos
              </h2>
            </div>
            <a href="/pacientes" className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Ver todos <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-1">
            {pacs.slice(0, 8).map(p => {
              const sc = score(p); const niv = nivel(p); const srv = servicio(p); const act = ua(p);
              const nom = displayName(p); const tel = formatTel(p.telefono_encriptado);
              return (
                <div key={p.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{ background: "#F4F4F6", color: "var(--text-secondary)" }}>
                    {nom.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{nom}</p>
                    <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                      {srv ? (SRV[srv] ?? srv) : "Sin servicio"} · {formatDistanceToNow(act, { locale: es, addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${niv === "alto" ? "text-gray-900" : niv === "medio" ? "text-gray-500" : "text-gray-300"}`}>{sc}</p>
                    <div className="score-bar w-10 mt-1"><div className="score-bar-fill" style={{ width: `${sc}%` }} /></div>
                  </div>
                </div>
              );
            })}
            {pacs.length === 0 && <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Sin actividad reciente</p>}
          </div>
        </div>
      </div>

      {/* Tabla pacientes */}
      <div className="dm-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="section-label mb-1">Todos los registros</p>
            <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.15rem", fontWeight: 600, color: "var(--text)" }}>Pacientes activos</h2>
          </div>
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>{pacs.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#FAFAFA", borderBottom: "1px solid var(--border)" }}>
                {["Nombre / Teléfono", "Estado", "Servicio", "Score", "Calificado", "Última actividad"].map(h => (
                  <th key={h} className="text-left px-5 py-3 section-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pacs.map(p => {
                const sc = score(p); const ec = estadoConv(p); const srv = servicio(p);
                const act = ua(p); const nom = displayName(p); const tel = formatTel(p.telefono_encriptado);
                const isListo = ec === "entrega_premium";
                return (
                  <tr key={p.id} className="table-row-hover" style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold" style={{ color: "var(--text)" }}>{nom}</p>
                      {tel && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{tel}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`badge ${isListo ? "badge-green" : "badge-gray"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isListo ? "bg-emerald-500" : "bg-gray-400"}`} />
                        {ec}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {srv ? (SRV[srv] ?? srv) : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ color: sc >= 60 ? "#111827" : sc >= 30 ? "#6B7280" : "#D1D5DB" }}>{sc}</span>
                        <div className="score-bar w-14"><div className="score-bar-fill" style={{ width: `${sc}%` }} /></div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium ${p.calificado ? "text-emerald-600" : "text-gray-300"}`}>
                        {p.calificado ? "✓ Sí" : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      {formatDistanceToNow(act, { locale: es, addSuffix: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pacs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin pacientes activos</p>
            </div>
          )}
        </div>
      </div>

      <div className="text-center py-2">
        <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-cormorant)", fontStyle: "italic" }}>
          Diego Mejía Dental Group · Creamos Estilos de Vida
        </p>
      </div>
    </div>
  );
}
