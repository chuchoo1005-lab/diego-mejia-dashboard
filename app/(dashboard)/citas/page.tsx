"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Search, RefreshCw, Phone, Flame } from "lucide-react";
import {
  Paciente, CardListo, CardOtro, CardHandlers,
  displayName, formatTel, sc, ec, resultadoLlamada, RESULTADOS_TERMINALES,
} from "@/components/CallCard";

export default function CitasPage() {
  const [leads, setLeads] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [notasTemp, setNotasTemp] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("pacientes")
      .select("id,alias,calificado,telefono_encriptado,perfil_paciente,updated_at,modo_humano")
      .eq("estado", "activo").order("updated_at", { ascending: false }).limit(100);
    setLeads((data || []) as Paciente[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const updatePerfil = async (id: string, updates: Record<string, unknown>) => {
    setSaving(id);
    const pac = leads.find(p => p.id === id);
    if (!pac) return;
    const newPerfil = { ...(pac.perfil_paciente || {}), ...updates };
    await supabase.from("pacientes").update({ perfil_paciente: newPerfil }).eq("id", id);
    setLeads(prev => prev.map(p => p.id === id ? { ...p, perfil_paciente: newPerfil } : p));
    setSaving(null);
  };

  const setResultado = (p: Paciente, valor: string) => updatePerfil(p.id, { resultado_llamada: valor, resultado_at: new Date().toISOString() });
  const guardarNotas = (p: Paciente) => { const nota = notasTemp[p.id] ?? (p.perfil_paciente?.notas_internas as string ?? ""); updatePerfil(p.id, { notas_internas: nota }); };

  const toggleCandado = async (p: Paciente) => {
    const nuevo = !p.modo_humano;
    setSaving(p.id);
    await supabase.from("pacientes").update({ modo_humano: nuevo, modo_humano_at: nuevo ? new Date().toISOString() : null }).eq("id", p.id);
    setLeads(prev => prev.map(x => x.id === p.id ? { ...x, modo_humano: nuevo } : x));
    setSaving(null);
  };

  const match = (p: Paciente) => {
    if (!busqueda) return true;
    const nom = displayName(p); const tel = formatTel(p.telefono_encriptado);
    return nom.toLowerCase().includes(busqueda.toLowerCase()) || tel.includes(busqueda);
  };

  const noTerminal = (p: Paciente) => !RESULTADOS_TERMINALES.includes(resultadoLlamada(p));
  const listos    = leads.filter(p => ec(p) === "entrega_premium" && noTerminal(p) && match(p));
  const calientes = leads.filter(p => ec(p) !== "entrega_premium" && sc(p) >= 60 && noTerminal(p) && match(p));
  const otros     = leads.filter(p => ec(p) !== "entrega_premium" && sc(p) < 60 && sc(p) >= 20 && noTerminal(p) && match(p));

  const stats = {
    listos: leads.filter(p => ec(p) === "entrega_premium").length,
    calientes: leads.filter(p => sc(p) >= 60).length,
    agendados: leads.filter(p => resultadoLlamada(p) === "valoracion_agendada").length,
  };

  const toggleExp = (id: string) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const handlers: CardHandlers = { expanded, toggleExp, notasTemp, setNotasTemp, saving, setResultado, guardarNotas, toggleCandado };

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Centro operativo</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)" }}>Leads para llamar</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>Actualización cada 30s</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Listos para llamar",      value: stats.listos,    color: "#10B981" },
          { label: "Score alto (≥60)",         value: stats.calientes, color: "var(--cyan)" },
          { label: "Valoraciones agendadas",   value: stats.agendados, color: "#A78BFA" },
        ].map(({ label, value, color }) => (
          <div key={label} className="dm-card p-4">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-3)" }} />
        <input type="text" placeholder="Buscar por nombre o teléfono..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text)" }} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(6,182,212,0.2)", borderTopColor: "var(--cyan)" }} />
        </div>
      ) : (
        <div className="space-y-8">

          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: "#10B981", boxShadow: "0 0 6px #10B981" }} />
              <h2 className="text-sm font-bold" style={{ color: "#10B981" }}>LISTOS PARA LLAMAR</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>{listos.length}</span>
            </div>
            {listos.length === 0 ? (
              <div className="dm-card p-8 text-center">
                <Phone className="w-7 h-7 mx-auto mb-2" style={{ color: "var(--text-3)" }} />
                <p className="text-sm" style={{ color: "var(--text-3)" }}>Sin leads listos aún</p>
              </div>
            ) : (
              <div className="space-y-3">
                {listos.map(p => <CardListo key={p.id} p={p} h={handlers} />)}
              </div>
            )}
          </section>

          {calientes.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-3.5 h-3.5" style={{ color: "var(--cyan)" }} />
                <h2 className="text-sm font-bold" style={{ color: "var(--cyan)" }}>LEADS CALIENTES</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(6,182,212,0.1)", color: "var(--cyan)" }}>{calientes.length}</span>
              </div>
              <div className="space-y-2">
                {calientes.map(p => <CardOtro key={p.id} p={p} accent h={handlers} />)}
              </div>
            </section>
          )}

          {otros.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: "var(--text-3)" }} />
                <h2 className="text-sm font-bold" style={{ color: "var(--text-3)" }}>EN PROCESO</h2>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-3)" }}>{otros.length}</span>
              </div>
              <div className="space-y-2">
                {otros.map(p => <CardOtro key={p.id} p={p} h={handlers} />)}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  );
}
