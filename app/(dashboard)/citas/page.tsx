"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase, SOLO_LECTURA } from "@/lib/supabase";
import { Search, RefreshCw } from "lucide-react";
import {
  Paciente, CardOtro, CardHandlers, Etapa, Extra,
  sc, ec, ua, etapaDe, resultadoUpdates, coincideBusqueda, citaDe, volverLlamarDe, proximoIntentoDe, finDeHoy, notasEquipo,
} from "@/components/CallCard";

type TabDef = { key: Etapa; label: string; color: string; icon: string; vacio: string };

// Las etapas siguen el recorrido real de una persona: antes de llamarla, el contacto por teléfono,
// la cita de valoración y el cierre. Cada una es un grupo exacto (sirve después para mensajes y recordatorios).
const GRUPOS: { titulo: string; tabs: TabDef[] }[] = [
  { titulo: "Antes de llamar", tabs: [
    { key: "llamar",        label: "Para llamar",      color: "#10B981", icon: "📞", vacio: "Nadie pendiente de llamar" },
    { key: "sin_terminar",  label: "Sin terminar",     color: "#F97316", icon: "🕓", vacio: "Nadie se quedó a medias" },
  ]},
  { titulo: "Llamadas", tabs: [
    { key: "no_contesto",   label: "No contestó",      color: "#F97316", icon: "📵", vacio: "Nadie pendiente por no contestar" },
    { key: "volver_llamar", label: "Volver a llamar",  color: "#38BDF8", icon: "📅", vacio: "Nadie pidió que la llamen otro día" },
    { key: "pensando",      label: "Pensándolo",       color: "#FBBF24", icon: "🤔", vacio: "Nadie lo está pensando" },
  ]},
  { titulo: "Valoración", tabs: [
    { key: "cerrados",      label: "Agendada",         color: "#22D3EE", icon: "🏆", vacio: "Nadie tiene valoración agendada" },
    { key: "reprogramo",    label: "Reprogramó",       color: "#60A5FA", icon: "🔁", vacio: "Nadie ha cambiado la fecha" },
    { key: "asistio",       label: "Asistió",          color: "#8B5CF6", icon: "✅", vacio: "Nadie ha asistido todavía" },
    { key: "no_asistio",    label: "No asistió",       color: "#FB923C", icon: "🚫", vacio: "Nadie ha faltado a su cita" },
  ]},
  { titulo: "Cerrado", tabs: [
    { key: "no_interesado", label: "No interesado",    color: "#EF4444", icon: "✕",  vacio: "Nadie dijo que no" },
  ]},
];
const TABS = GRUPOS.flatMap(g => g.tabs);

const tiempo = (d: Date | null, siNo: number) => d ? d.getTime() : siNo;
const at = (p: Paciente, campo: string) => { const v = p.perfil_paciente?.[campo]; return v ? new Date(String(v)).getTime() : 0; };

export default function CitasPage() {
  const [leads, setLeads] = useState<Paciente[]>([]);
  const [agendarIniciado, setAgendarIniciado] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Etapa>("llamar");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [notasTemp, setNotasTemp] = useState<Record<string, string>>({});
  const [ejemplo, setEjemplo] = useState(false);

  const load = useCallback(async () => {
    // Revisión en local sin sesión (modo prueba): se muestran pacientes inventados.
    if (SOLO_LECTURA && !(await supabase.auth.getUser()).data.user) {
      const { pacientesDeEjemplo } = await import("@/lib/ejemplos");
      const ej = pacientesDeEjemplo();
      setLeads(ej.leads); setAgendarIniciado(ej.sinTerminar); setEjemplo(true); setLoading(false);
      return;
    }
    const SEL = "id,alias,calificado,telefono_encriptado,perfil_paciente,updated_at,modo_humano";
    const [{ data: recientes }, { data: enPipeline }, { data: convData }] = await Promise.all([
      supabase.from("pacientes").select(SEL)
        .eq("estado", "activo").order("updated_at", { ascending: false }).limit(200),
      // Leads ya movidos a mano no deben desaparecer solo porque el bot no los ha vuelto a tocar
      // y quedaron fuera del limit(200) de arriba — se traen aparte, sin límite.
      supabase.from("pacientes").select(SEL)
        .eq("estado", "activo").not("perfil_paciente->>resultado_llamada", "is", null),
      // El bot solo envía "...¿cómo te llamas?" justo después de pulsar "Agendar valoración" (o responder "sí" a un seguimiento).
      // Es la señal confiable de que alguien inició el registro (ver "Sin terminar").
      supabase.from("conversaciones").select("paciente_id").eq("direccion", "saliente").ilike("mensaje_encriptado", "%cómo te llamas%"),
    ]);
    const porId = new Map<string, Paciente>();
    (recientes || []).forEach((p) => porId.set((p as Paciente).id, p as Paciente));
    (enPipeline || []).forEach((p) => porId.set((p as Paciente).id, p as Paciente));
    setLeads(Array.from(porId.values()));
    setAgendarIniciado(new Set((convData || []).map((c: { paciente_id: string }) => c.paciente_id)));
    setLoading(false);
  }, []);

  // En modo de prueba no se recarga solo: si recargara, los movimientos de prueba (que no se guardan) se desharían.
  useEffect(() => {
    load();
    if (SOLO_LECTURA) return;
    const t = setInterval(load, 30000); return () => clearInterval(t);
  }, [load]);

  // Sincronización en tiempo real: si alguien mueve un lead desde otro dispositivo, se refleja aquí al instante
  useEffect(() => {
    if (SOLO_LECTURA) return;
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
    if (!pac) { setSaving(null); return; }
    const newPerfil = { ...(pac.perfil_paciente || {}), ...updates };
    // updated_at se pone a mano porque la tabla no lo actualiza sola en cada UPDATE (si no, el lead
    // movido queda con la fecha vieja y puede caer fuera del limit(200) de load()).
    const nowIso = new Date().toISOString();
    await supabase.from("pacientes").update({ perfil_paciente: newPerfil, updated_at: nowIso }).eq("id", id);
    setLeads(prev => prev.map(p => p.id === id ? { ...p, perfil_paciente: newPerfil, updated_at: nowIso } : p));
    setSaving(null);
  };

  const setResultado = (p: Paciente, valor: string, extra?: Extra) => {
    updatePerfil(p.id, resultadoUpdates(valor, p, extra));
    // Cierra la tarjeta: la persona pasa a su nueva pestaña.
    setExpanded(prev => { const s = new Set(prev); s.delete(p.id); return s; });
  };
  const guardarNotas = (p: Paciente) => { const nota = notasTemp[p.id] ?? notasEquipo(p); updatePerfil(p.id, { notas_equipo: nota }); };

  const toggleCandado = async (p: Paciente) => {
    const nuevo = !p.modo_humano;
    setSaving(p.id);
    const nowIso = new Date().toISOString();
    await supabase.from("pacientes").update({ modo_humano: nuevo, modo_humano_at: nuevo ? nowIso : null, updated_at: nowIso }).eq("id", p.id);
    setLeads(prev => prev.map(x => x.id === p.id ? { ...x, modo_humano: nuevo, updated_at: nowIso } : x));
    setSaving(null);
  };

  const match = (p: Paciente) => coincideBusqueda(p, busqueda);

  // Pidió agendar con el bot (recibió "¿cómo te llamas?") pero nunca completó los datos.
  const agendamientoIncompleto = (p: Paciente) => agendarIniciado.has(p.id) && ec(p) !== "entrega_premium";

  // Etapa que se muestra: "Para llamar" exige datos completos (o interés alto); el resto, lo que se registró.
  const etapaVista = (p: Paciente): Etapa | null => {
    const e = etapaDe(p);
    if (e !== "llamar") return e;
    if (agendamientoIncompleto(p)) return "sin_terminar";
    if (ec(p) === "entrega_premium" || sc(p) >= 60) return "llamar";
    return null;
  };

  const porEtapa: Record<Etapa, Paciente[]> = {
    llamar: [], sin_terminar: [], no_contesto: [], volver_llamar: [], pensando: [],
    cerrados: [], reprogramo: [], asistio: [], no_asistio: [], no_interesado: [],
  };
  for (const p of leads) { const e = etapaVista(p); if (e && match(p)) porEtapa[e].push(p); }

  // Orden de cada lista: primero lo que hay que hacer antes.
  const recientePrimero = (a: Paciente, b: Paciente) => ua(b).getTime() - ua(a).getTime();
  const resultadoReciente = (a: Paciente, b: Paciente) => at(b, "resultado_at") - at(a, "resultado_at");
  porEtapa.llamar.sort(recientePrimero);
  porEtapa.sin_terminar.sort(recientePrimero);
  // el que ya toca intentar primero; entre iguales, el intento más viejo
  porEtapa.no_contesto.sort((a, b) => tiempo(proximoIntentoDe(a), 0) - tiempo(proximoIntentoDe(b), 0) || at(a, "ultima_llamada_at") - at(b, "ultima_llamada_at"));
  porEtapa.volver_llamar.sort((a, b) => tiempo(volverLlamarDe(a), 9e15) - tiempo(volverLlamarDe(b), 9e15)); // el día más cercano primero
  porEtapa.pensando.sort(resultadoReciente);
  porEtapa.cerrados.sort((a, b) => tiempo(citaDe(a), 9e15) - tiempo(citaDe(b), 9e15));                   // la cita más próxima primero
  porEtapa.reprogramo.sort((a, b) => tiempo(citaDe(a), 9e15) - tiempo(citaDe(b), 9e15));
  porEtapa.asistio.sort(resultadoReciente);
  porEtapa.no_asistio.sort(resultadoReciente);
  porEtapa.no_interesado.sort(resultadoReciente);

  const toggleExp = (id: string) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const handlers: CardHandlers = { expanded, toggleExp, notasTemp, setNotasTemp, saving, setResultado, guardarNotas, toggleCandado };

  const currentList = porEtapa[tab];
  const currentTab = TABS.find(t => t.key === tab)!;

  // "Para hoy": lo que la asesora tiene que hacer hoy, como la bandeja de tareas de un CRM.
  const fin = finDeHoy();
  const inicioHoy = new Date(new Date().toDateString()).getTime();
  const conCita = [...porEtapa.cerrados, ...porEtapa.reprogramo];
  const hoy = [
    { key: "llamar" as Etapa, icon: "📞", label: "Nuevos por llamar", n: porEtapa.llamar.length, color: "#10B981" },
    { key: "no_contesto" as Etapa, icon: "📵", label: "Reintentar hoy", n: porEtapa.no_contesto.filter(p => tiempo(proximoIntentoDe(p), 0) <= fin).length, color: "#F97316" },
    { key: "volver_llamar" as Etapa, icon: "📅", label: "Llamar hoy", n: porEtapa.volver_llamar.filter(p => tiempo(volverLlamarDe(p), 0) <= fin).length, color: "#38BDF8" },
    { key: "cerrados" as Etapa, icon: "🗓", label: "Citas de hoy", n: conCita.filter(p => { const t = tiempo(citaDe(p), -1); return t >= inicioHoy && t <= fin; }).length, color: "#22D3EE" },
    { key: "cerrados" as Etapa, icon: "❓", label: "¿Asistió? sin marcar", n: conCita.filter(p => { const t = tiempo(citaDe(p), -1); return t > 0 && t < Date.now() - 2 * 3600_000; }).length, color: "#EF4444" },
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {SOLO_LECTURA && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: "rgba(251,191,36,0.12)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.35)" }}>
          🧪 Modo prueba: puedes mover a las personas para ver cómo funciona, pero nada se guarda. Al recargar la página vuelve todo como estaba.
          {ejemplo && <span className="block mt-1 font-normal">Estás viendo pacientes de ejemplo inventados (no se inició sesión).</span>}
        </div>
      )}

      {/* Encabezado */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="section-label mb-2">CRM · Pacientes</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)" }}>Leads</h1>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-4 min-h-[44px] rounded-xl"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* Para hoy */}
      <div className="dm-card p-3">
        <p className="section-label mb-2 px-0.5">Para hoy</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {hoy.map(x => (
            <button key={x.label} onClick={() => setTab(x.key)} disabled={!x.n}
              className="flex items-center gap-2 min-h-[48px] px-2.5 rounded-xl text-left"
              style={{ background: x.n ? `${x.color}14` : "rgba(255,255,255,0.02)", border: `1px solid ${x.n ? x.color + "40" : "var(--border)"}`, opacity: x.n ? 1 : 0.55, WebkitTapHighlightColor: "transparent" }}>
              <span className="text-[18px] font-black shrink-0" style={{ color: x.n ? x.color : "var(--text-3)" }}>{x.n}</span>
              <span className="text-[12px] font-semibold leading-tight" style={{ color: x.n ? "var(--text)" : "var(--text-3)" }}>{x.icon} {x.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Etapas agrupadas por el recorrido de la persona */}
      <div className="space-y-2.5">
        {GRUPOS.map(g => (
          <div key={g.titulo}>
            <p className="section-label mb-1 px-0.5">{g.titulo}</p>
            <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
              {g.tabs.map(({ key, label, color, icon }) => {
                const active = tab === key;
                const count = porEtapa[key].length;
                return (
                  <button key={key} onClick={() => setTab(key)}
                    className="flex items-center gap-1.5 min-h-[44px] px-2.5 sm:px-3.5 rounded-xl transition-all min-w-0"
                    style={{
                      background: active ? `${color}26` : `${color}0c`,
                      border: `1.5px solid ${active ? `${color}80` : `${color}25`}`,
                      WebkitTapHighlightColor: "transparent",
                    }}>
                    <span className="text-[14px] shrink-0">{icon}</span>
                    <span className="text-[13px] sm:text-[14px] font-semibold truncate flex-1 text-left" style={{ color: active ? color : "var(--text-2)" }}>{label}</span>
                    <span className="text-[12px] font-black min-w-[22px] px-1.5 py-0.5 rounded-full text-center shrink-0"
                      style={{ background: active ? color : "rgba(255,255,255,0.08)", color: active ? "#000" : "var(--text-2)" }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-3)" }} />
        <input type="search" placeholder="Buscar por nombre o teléfono..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 min-h-[48px] text-base rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text)" }} />
      </div>

      {/* Título de la lista */}
      <div className="flex items-center gap-2">
        <span>{currentTab.icon}</span>
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: currentTab.color }}>{currentTab.label}</h2>
        <span className="text-sm px-2 py-0.5 rounded-full font-bold" style={{ background: `${currentTab.color}15`, color: currentTab.color }}>{currentList.length}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(6,182,212,0.2)", borderTopColor: "var(--cyan)" }} />
        </div>
      ) : currentList.length === 0 ? (
        <div className="dm-card p-10 text-center">
          <p className="text-2xl mb-2">{currentTab.icon}</p>
          <p className="font-medium" style={{ color: "var(--text-2)" }}>{currentTab.vacio}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map(p => <CardOtro key={p.id} p={p} etapa={tab} accent={tab === "llamar"} sinTerminarAgendar={tab === "sin_terminar"} h={handlers} />)}
        </div>
      )}
    </div>
  );
}
