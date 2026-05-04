"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquare, Users, CheckCircle, Flame, RefreshCw, TrendingUp, ArrowUpRight, Phone } from "lucide-react";

interface Paciente {
  id: string; alias: string; estado: string; calificado: boolean;
  perfil_paciente: Record<string, unknown>; created_at: string; updated_at: string;
}

const SRV: Record<string, string> = { ortodoncia: "Ortodoncia", diseno: "Diseño de sonrisa", general: "Odontología general" };

function nombre(p: Paciente): string {
  return (p.perfil_paciente?.nombre as string) || p.alias;
}
function score(p: Paciente): number {
  return parseInt(String(p.perfil_paciente?.score ?? "0")) || 0;
}
function estadoConv(p: Paciente): string {
  return (p.perfil_paciente?.estado_conv as string) || "nuevo";
}
function servicio(p: Paciente): string | null {
  return (p.perfil_paciente?.servicio_interes as string) || null;
}
function nivel(p: Paciente): string {
  return (p.perfil_paciente?.nivel_interes as string) || "bajo";
}
function ua(p: Paciente): Date {
  const v = p.perfil_paciente?.ultima_actividad_at as string;
  return v ? new Date(v) : new Date(p.updated_at);
}
function buildSugerencias(pacs: Paciente[]) {
  const sugs: { tipo: string; nombre: string; accion: string; srv: string | null; sc: number }[] = [];
  const now = Date.now();
  pacs.forEach(p => {
    const sc = score(p); const srv = servicio(p); const ec = estadoConv(p);
    const hrs = (now - ua(p).getTime()) / 3600000;
    const ti = p.perfil_paciente?.tipo_intencion as string;
    if (ti === "referido") sugs.push({ tipo: "referido", nombre: nombre(p), accion: "Referido nuevo — alta prioridad", srv, sc });
    else if (sc >= 70) sugs.push({ tipo: "caliente", nombre: nombre(p), accion: "Lead caliente — confirmar valoración", srv, sc });
    else if (hrs > 48 && sc >= 20 && ec !== "entrega_premium") sugs.push({ tipo: "seguimiento", nombre: nombre(p), accion: `Sin respuesta ${Math.round(hrs)}h — enviar recordatorio`, srv, sc });
    else if (ec === "nuevo" && hrs < 2) sugs.push({ tipo: "nuevo", nombre: nombre(p), accion: "Lead nuevo — responder pronto", srv, sc });
  });
  return sugs.sort((a, b) => b.sc - a.sc).slice(0, 6);
}

export default function Home() {
  const [kpis, setKpis] = useState({ totalPacientes: 0, pacientesHoy: 0, convsHoy: 0, calificados: 0, listos: 0 });
  const [pacs, setPacs] = useState<Paciente[]>([]);
  const [sugs, setSugs] = useState<ReturnType<typeof buildSugerencias>>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      const [{ count: total }, { count: hoy }, { count: convs }, { count: calif }, { data: pacsData }] = await Promise.all([
        supabase.from("pacientes").select("*", { count: "exact", head: true }),
        supabase.from("pacientes").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
        supabase.from("conversaciones").select("*", { count: "exact", head: true }).gte("timestamp", todayISO),
        supabase.from("pacientes").select("*", { count: "exact", head: true }).eq("calificado", true),
        supabase.from("pacientes").select("id,alias,estado,calificado,perfil_paciente,created_at,updated_at").eq("estado", "activo").order("updated_at", { ascending: false }).limit(40),
      ]);
      const data = (pacsData || []) as Paciente[];
      const listos = data.filter(p => estadoConv(p) === "entrega_premium").length;
      setKpis({ totalPacientes: total ?? 0, pacientesHoy: hoy ?? 0, convsHoy: convs ?? 0, calificados: calif ?? 0, listos });
      setPacs(data); setSugs(buildSugerencias(data)); setLastUpdate(new Date());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border border-white/30 border-t-white rounded-full animate-spin" />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Cargando panel...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-7 animate-fade-in">

      {/* ── Header con stats clave ────────────────────────────── */}
      <div className="dm-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="section-label mb-1.5">Diego Mejía Dental Group</p>
            <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.6rem", fontWeight: 400, color: "#FFF" }}>
              {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </h1>
          </div>
          {/* Stats rápidos en el header */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{kpis.convsHoy}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Chats hoy</p>
            </div>
            <div className="w-px h-8" style={{ background: "var(--border)" }} />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{kpis.pacientesHoy}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Nuevos hoy</p>
            </div>
            <div className="w-px h-8" style={{ background: "var(--border)" }} />
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: kpis.listos > 0 ? "#FFF" : "var(--text-muted)" }}>{kpis.listos}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Listos para llamar</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] pl-2" style={{ color: "var(--text-muted)" }}>
              <RefreshCw className="w-3 h-3" />
              {format(lastUpdate, "HH:mm")}
              <div className="w-1.5 h-1.5 bg-white rounded-full active-dot" />
            </div>
          </div>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total pacientes", value: kpis.totalPacientes, icon: Users },
          { label: "Nuevos hoy", value: kpis.pacientesHoy, icon: TrendingUp },
          { label: "Chats hoy", value: kpis.convsHoy, icon: MessageSquare },
          { label: "Calificados", value: kpis.calificados, icon: CheckCircle },
          { label: "Listos para llamar", value: kpis.listos, icon: Phone, highlight: true },
        ].map(({ label, value, icon: Icon, highlight }, i) => (
          <div key={label} className="dm-card p-4 animate-fade-up" style={{ animationDelay: `${i * 50}ms`, ...(highlight && value > 0 ? { borderColor: "rgba(255,255,255,0.25)" } : {}) }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                <Icon className="w-3.5 h-3.5" style={{ color: highlight && value > 0 ? "#FFF" : "var(--text-secondary)" }} />
              </div>
              {highlight && value > 0 && <div className="w-1.5 h-1.5 bg-white rounded-full active-dot" />}
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Sugerencias + Actividad ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sugerencias */}
        <div className="dm-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-label mb-1">IA · Acciones recomendadas</p>
              <h2 className="font-semibold text-white" style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem" }}>Sugerencias</h2>
            </div>
            <span className="text-xs px-2 py-1 rounded-sm font-medium" style={{ background: "rgba(255,255,255,0.07)", color: "var(--text-secondary)" }}>
              {sugs.length} pendientes
            </span>
          </div>
          {sugs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sin sugerencias activas</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>El sistema monitorea leads en tiempo real</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sugs.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-sm transition-colors hover:bg-white/[0.03]"
                  style={{ background: "rgba(255,255,255,0.025)", borderLeft: `2px solid ${s.tipo === "caliente" || s.tipo === "referido" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)"}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-white truncate">{s.nombre}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm capitalize shrink-0" style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}>{s.tipo}</span>
                    </div>
                    <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{s.accion}</p>
                    {s.srv && <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{SRV[s.srv] ?? s.srv}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-white">{s.sc}</p>
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
              <h2 className="font-semibold text-white" style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem" }}>Pacientes activos</h2>
            </div>
            <a href="/pacientes" className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Ver todos <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-1">
            {pacs.slice(0, 7).map(p => {
              const sc = score(p); const niv = nivel(p); const srv = servicio(p); const act = ua(p);
              const nomReal = (p.perfil_paciente?.nombre as string) || null;
              return (
                <div key={p.id} className="flex items-center gap-3 px-2 py-2.5 rounded-sm hover:bg-white/[0.025] transition-colors">
                  <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}>
                    {(nomReal || p.alias).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{nomReal || p.alias}</p>
                    {nomReal && <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{p.alias}</p>}
                    <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                      {srv ? (SRV[srv] ?? srv) : "Sin servicio"} · {formatDistanceToNow(act, { locale: es, addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${niv === "alto" ? "text-white" : niv === "medio" ? "text-white/60" : "text-white/35"}`}>{sc}</p>
                    <div className="score-bar w-10 mt-1"><div className="score-bar-fill" style={{ width: `${sc}%` }} /></div>
                  </div>
                </div>
              );
            })}
            {pacs.length === 0 && <p className="text-sm text-center py-8" style={{ color: "var(--text-secondary)" }}>Sin actividad reciente</p>}
          </div>
        </div>
      </div>

      {/* ── Tabla pacientes ───────────────────────────────────── */}
      <div className="dm-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="section-label mb-1">Gestión de leads</p>
            <h2 className="font-semibold text-white" style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem" }}>Todos los pacientes activos</h2>
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{pacs.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Nombre / ID", "Estado conversación", "Servicio", "Score", "Calificado", "Última actividad"].map(h => (
                  <th key={h} className="text-left pb-3 pr-4 section-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pacs.map(p => {
                const sc = score(p); const ec = estadoConv(p); const srv = servicio(p);
                const act = ua(p); const hrs = differenceInHours(new Date(), act);
                const nomReal = (p.perfil_paciente?.nombre as string) || null;
                return (
                  <tr key={p.id} className="table-row-hover" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-white">{nomReal || p.alias}</p>
                      {nomReal && <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{p.alias}</p>}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs px-2 py-1 rounded-sm font-medium"
                        style={{ background: ec === "entrega_premium" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)", color: ec === "entrega_premium" ? "#FFF" : "var(--text-secondary)", border: `1px solid ${ec === "entrega_premium" ? "rgba(255,255,255,0.2)" : "transparent"}` }}>
                        {ec}
                      </span>
                    </td>
                    <td className="py-3 pr-4" style={{ color: "var(--text-secondary)" }}>{srv ? (SRV[srv] ?? srv) : "—"}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${sc >= 60 ? "text-white" : sc >= 30 ? "text-white/60" : "text-white/35"}`}>{sc}</span>
                        <div className="score-bar w-14"><div className="score-bar-fill" style={{ width: `${sc}%` }} /></div>
                      </div>
                    </td>
                    <td className="py-3 pr-4"><span className={`text-xs font-medium ${p.calificado ? "text-white" : "text-white/30"}`}>{p.calificado ? "✓ Sí" : "—"}</span></td>
                    <td className="py-3"><span className="text-xs" style={{ color: hrs > 48 ? "var(--text-muted)" : "var(--text-secondary)" }}>{formatDistanceToNow(act, { locale: es, addSuffix: true })}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pacs.length === 0 && <p className="text-sm text-center py-10" style={{ color: "var(--text-secondary)" }}>Sin pacientes activos</p>}
        </div>
      </div>

      <div className="text-center py-1">
        <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-cormorant)", fontStyle: "italic" }}>
          Diego Mejía Dental Group · Creamos Estilos de Vida
        </p>
      </div>
    </div>
  );
}
