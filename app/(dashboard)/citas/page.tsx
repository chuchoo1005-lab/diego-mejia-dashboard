"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Search, RefreshCw, Phone, TrendingUp, XCircle, Trophy } from "lucide-react";
import {
  Paciente, CardListo, CardOtro, CardHandlers,
  displayName, formatTel, sc, ec, resultadoLlamada, MAP_A_ETAPA,
} from "@/components/CallCard";

type PipelineTab = "llamar" | "proceso" | "cerrados" | "no_interesado";

const TABS: { key: PipelineTab; label: string; color: string; icon: React.ElementType }[] = [
  { key: "llamar",        label: "Para llamar",   color: "#10B981", icon: Phone },
  { key: "proceso",       label: "En proceso",    color: "#FBBF24", icon: TrendingUp },
  { key: "cerrados",      label: "Cerrados",      color: "#22D3EE", icon: Trophy },
  { key: "no_interesado", label: "No interesado", color: "#EF4444", icon: XCircle },
];

export default function CitasPage() {
  const [leads, setLeads] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<PipelineTab>("llamar");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [notasTemp, setNotasTemp] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("pacientes")
      .select("id,alias,calificado,telefono_encriptado,perfil_paciente,updated_at,modo_humano")
      .eq("estado", "activo").order("updated_at", { ascending: false }).limit(200);
    setLeads((data || []) as Paciente[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  // Sincronización en tiempo real: si alguien mueve un lead desde otro dispositivo, se refleja aquí al instante
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel("realtime-pacientes-citas")
      .on("postgres_changes", { event: "*", schema: "public", table: "pacientes" }, () => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(load, 800);
      })
      .subscribe();
    return () => { if (timeout) clearTimeout(timeout); supabase.removeChannel(channel); };
  }, [load]);

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

  // Etapa de cada lead según MAP_A_ETAPA
  const etapa = (p: Paciente): PipelineTab => {
    const r = resultadoLlamada(p);
    if (!r) return "llamar";
    return (MAP_A_ETAPA[r] as PipelineTab) ?? "llamar";
  };

  const paraLlamar    = leads.filter(p => etapa(p) === "llamar" && (ec(p) === "entrega_premium" || sc(p) >= 60) && match(p));
  const enProceso     = leads.filter(p => etapa(p) === "proceso"       && match(p));
  const cerrados      = leads.filter(p => etapa(p) === "cerrados"      && match(p));
  const noInteresado  = leads.filter(p => etapa(p) === "no_interesado" && match(p));

  const counts: Record<PipelineTab, number> = {
    llamar: paraLlamar.length,
    proceso: enProceso.length,
    cerrados: cerrados.length,
    no_interesado: noInteresado.length,
  };

  const toggleExp = (id: string) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const handlers: CardHandlers = { expanded, toggleExp, notasTemp, setNotasTemp, saving, setResultado, guardarNotas, toggleCandado };

  const currentList = { llamar: paraLlamar, proceso: enProceso, cerrados, no_interesado: noInteresado }[tab];
  const currentTab = TABS.find(t => t.key === tab)!;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">CRM · Pipeline</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)" }}>Leads</h1>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* Pipeline tabs */}
      <div className="grid grid-cols-4 gap-2">
        {TABS.map(({ key, label, color, icon: Icon }) => {
          const active = tab === key;
          const count = counts[key];
          return (
            <button key={key} onClick={() => setTab(key)}
              className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl text-center transition-all"
              style={{
                background: active ? `${color}18` : "rgba(255,255,255,0.03)",
                border: `1px solid ${active ? `${color}40` : "var(--border)"}`,
              }}>
              <Icon className="w-4 h-4" style={{ color: active ? color : "var(--text-3)" }} />
              <span className="text-xl font-black leading-none" style={{ color: active ? color : "var(--text-2)" }}>{count}</span>
              <span className="text-[10px] font-medium leading-tight" style={{ color: active ? color : "var(--text-3)" }}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-3)" }} />
        <input type="text" placeholder="Buscar por nombre o teléfono..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text)" }} />
      </div>

      {/* Section label */}
      <div className="flex items-center gap-2">
        <currentTab.icon className="w-4 h-4" style={{ color: currentTab.color }} />
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: currentTab.color }}>{currentTab.label}</h2>
        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${currentTab.color}15`, color: currentTab.color }}>{currentList.length}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(6,182,212,0.2)", borderTopColor: "var(--cyan)" }} />
        </div>
      ) : currentList.length === 0 ? (
        <div className="dm-card p-10 text-center">
          <currentTab.icon className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-3)" }} />
          <p className="font-medium" style={{ color: "var(--text-2)" }}>
            {tab === "llamar" ? "Sin leads pendientes de llamar"
            : tab === "proceso" ? "Sin leads en proceso"
            : tab === "cerrados" ? "Sin leads cerrados"
            : "Sin leads no interesados"}
          </p>
          {tab !== "llamar" && (
            <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
              Mueve leads aquí desde "Para llamar"
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tab === "llamar"
            ? currentList.map(p =>
                ec(p) === "entrega_premium"
                  ? <CardListo key={p.id} p={p} h={handlers} />
                  : <CardOtro key={p.id} p={p} accent={sc(p) >= 60} h={handlers} />
              )
            : currentList.map(p => <CardOtro key={p.id} p={p} h={handlers} />)
          }
        </div>
      )}
    </div>
  );
}
