"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, Users, Megaphone, Sparkles, PhoneCall, CalendarCheck, CheckCircle, DollarSign, Search, Check, X, HelpCircle } from "lucide-react";
import { MAP_A_ETAPA, RESULTADOS, CardOtro, CardHandlers, Paciente, resultadoLlamada, resultadoUpdates, coincideBusqueda } from "@/components/CallCard";
import { COP } from "@/lib/precios";

// Colaboración con Sara Pinzón (@saraigram): campaña "PRO | Ortodoncia Invisible | Colab SARA | Oct2026".
// Un lead cuenta como de Sara si llegó desde un anuncio de esa campaña, si el bot lo marcó con promo = "SARA"
// (escribió la palabra SARA en sus primeros mensajes, p. ej. desde las historias de ella), si escribió "Sara" en el chat,
// o si la asesora lo confirmó a mano (perfil_paciente.colab_sara = true, campo solo del panel: el bot no lo lee).
// Solo se cuentan leads creados desde el inicio de la colaboración, para no mezclar pacientes viejos que se llaman Sara.
const INICIO = "2026-10-16";
const INICIO_ISO = "2026-10-16T20:00:00Z"; // viernes 16-oct 3:00 p. m. hora Bogotá: Sara publicó el video
const SARA_AD_IDS = ["120250406897410109"]; // respaldo mientras WF-12 sincroniza el gasto del día
const ETAPAS_AGENDO = ["cerrados", "asistio", "no_asistio", "reprogramo"];
const PALABRA_SARA = /(^|[^a-záéíóúñ])sara(igram)?([^a-záéíóúñ]|$)/i; // "Sara" o "saraigram" como palabra suelta (no Saray, Sarai)
const BASE_DESDE_ISO = "2026-10-01T05:00:00Z"; // promedio de orgánicos antes de la colaboración (1-oct hasta que Sara publicó)
const BASE_DIAS = (Date.parse(INICIO_ISO) - Date.parse(BASE_DESDE_ISO)) / 86400000;
const SEL = "id,alias,calificado,telefono_encriptado,modo_humano,perfil_paciente,updated_at,created_at";

type Pac = Paciente & { created_at: string };
type Origen = "anuncio" | "contenido" | "confirmado" | "sin_confirmar";
type Grupo = "campana" | "organico" | "confirmar";

const ORIGEN: Record<Origen, { label: string; color: string }> = {
  anuncio:       { label: "Anuncio pagado",           color: "var(--cyan)" },
  contenido:     { label: "Escribió “Sara” en el chat", color: "#C084FC" },
  confirmado:    { label: "Confirmado por la asesora", color: "#34D399" },
  sin_confirmar: { label: "Orgánico sin confirmar",   color: "var(--text-3)" },
};

const GRUPOS: { key: Grupo; label: string; desc: string; color: string; icon: React.ElementType }[] = [
  { key: "campana",   label: "Campaña pagada",       desc: "Tocaron el anuncio de la campaña Colab SARA",                color: "#22D3EE", icon: Megaphone },
  { key: "organico",  label: "Orgánico de Sara",     desc: "Llegaron sin anuncio por el contenido de Sara (lo dijeron en el chat o la asesora lo confirmó)", color: "#C084FC", icon: Sparkles },
  { key: "confirmar", label: "Orgánicos por confirmar", desc: "Llegaron sin anuncio y no mencionaron a Sara: no se suman a las cifras", color: "#94A3B8", icon: HelpCircle },
];

// Etapa del CRM de cada persona ("" = todavía nadie la ha movido)
const etapaDe = (p: Paciente) => { const r = resultadoLlamada(p); return r ? (MAP_A_ETAPA[r] ?? "") : ""; };
const FILTROS = RESULTADOS.map(r => ({ key: r.value === "cerrado" ? "cerrados" : r.value, label: r.value === "" ? "Sin gestionar" : r.label, color: r.color }));

// Entregado = el bot la pasó a la asesora, o la asesora ya la movió en el CRM (si no, "Agendaron" podría superar a "Entregados")
const resumen = (ps: Paciente[]) => ({
  llegaron: ps.length,
  entregados: ps.filter(p => p.perfil_paciente?.notificado_asesora === true || !!resultadoLlamada(p)).length,
  agendaron: ps.filter(p => ETAPAS_AGENDO.includes(etapaDe(p))).length,
  asistieron: ps.filter(p => etapaDe(p) === "asistio").length,
});

export default function SaraPage() {
  const [pacientes, setPacientes] = useState<Pac[]>([]);
  const [adIds, setAdIds] = useState<string[]>(SARA_AD_IDS);
  const [idsMencion, setIdsMencion] = useState<Set<string>>(new Set());
  const [gasto, setGasto] = useState(0);
  const [gastoHasta, setGastoHasta] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [promedioAntes, setPromedioAntes] = useState(0);
  const [grupo, setGrupo] = useState<Grupo>("campana");
  const [filtro, setFiltro] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [notasTemp, setNotasTemp] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data: ads } = await supabase.from("meta_ads_diario")
      .select("fecha,ad_id,spend_cop").ilike("campaign_name", "%SARA%").gte("fecha", INICIO);
    const ids = Array.from(new Set([...SARA_AD_IDS, ...(ads || []).map(a => String(a.ad_id))]));
    setAdIds(ids);
    setGasto((ads || []).reduce((s, a) => s + (Number(a.spend_cop) || 0), 0));
    setGastoHasta((ads || []).map(a => a.fecha as string).sort().pop() || null);

    // Leads que escribieron "Sara" en el chat (incluye a los que llegaron por el wa.me de ella antes de que el bot marcara la palabra)
    const { data: menciones } = await supabase.from("conversaciones")
      .select("paciente_id,mensaje_encriptado").eq("direccion", "entrante").gte("timestamp", INICIO_ISO).ilike("mensaje_encriptado", "%sara%");
    const mencion = Array.from(new Set((menciones || []).filter(m => PALABRA_SARA.test(String(m.mensaje_encriptado || ""))).map(m => String(m.paciente_id))));
    setIdsMencion(new Set(mencion));

    const filtros = [`perfil_paciente->>promo.eq.SARA`, `perfil_paciente->>colab_sara.eq.true`, `perfil_paciente->>anuncio_id.in.(${ids.join(",")})`];
    if (mencion.length) filtros.push(`id.in.(${mencion.join(",")})`);
    // Se traen juntos los candidatos a Sara y los orgánicos del período: la clasificación se hace abajo,
    // así al confirmar o descartar a alguien a mano cambia de lista al instante sin recargar.
    const [{ data: pacs }, { data: orgPac }, { count: orgAntes }] = await Promise.all([
      supabase.from("pacientes").select(SEL).gte("created_at", INICIO_ISO).or(filtros.join(",")),
      supabase.from("pacientes").select(SEL).gte("created_at", INICIO_ISO).eq("perfil_paciente->>origen_lead", "organico"),
      supabase.from("pacientes").select("id", { count: "exact", head: true }).gte("created_at", BASE_DESDE_ISO).lt("created_at", INICIO_ISO).eq("perfil_paciente->>origen_lead", "organico"),
    ]);
    const porId = new Map<string, Pac>();
    [...(pacs || []), ...(orgPac || [])].forEach(r => porId.set(String(r.id), r as unknown as Pac));
    setPacientes(Array.from(porId.values()).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    setPromedioAntes((orgAntes || 0) / BASE_DIAS);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Si la asesora mueve a alguien desde el CRM (/citas) u otro dispositivo, se refleja aquí también
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel("realtime-pacientes-sara")
      .on("postgres_changes", { event: "*", schema: "public", table: "pacientes" }, () => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(load, 800);
      })
      .subscribe();
    return () => { if (timeout) clearTimeout(timeout); supabase.removeChannel(channel); };
  }, [load]);

  // Mismo guardado que el CRM (/citas): se escribe sobre el mismo paciente, así que el cambio aparece en ambos lados
  const updatePerfil = async (id: string, updates: Record<string, unknown>) => {
    const pac = pacientes.find(p => p.id === id);
    if (!pac) return;
    setSaving(id);
    const newPerfil = { ...(pac.perfil_paciente || {}), ...updates };
    const nowIso = new Date().toISOString();
    await supabase.from("pacientes").update({ perfil_paciente: newPerfil, updated_at: nowIso }).eq("id", id);
    setPacientes(prev => prev.map(p => p.id === id ? { ...p, perfil_paciente: newPerfil, updated_at: nowIso } : p));
    setSaving(null);
  };
  const setResultado = (p: Paciente, valor: string) => updatePerfil(p.id, resultadoUpdates(valor));
  const guardarNotas = (p: Paciente) => { const nota = notasTemp[p.id] ?? (p.perfil_paciente?.notas_internas as string ?? ""); updatePerfil(p.id, { notas_internas: nota }); };
  const marcarSara = (p: Paciente, valor: boolean | null) => updatePerfil(p.id, { colab_sara: valor, colab_sara_at: new Date().toISOString() });
  const toggleCandado = async (p: Paciente) => {
    const nuevo = !p.modo_humano;
    setSaving(p.id);
    const nowIso = new Date().toISOString();
    await supabase.from("pacientes").update({ modo_humano: nuevo, modo_humano_at: nuevo ? nowIso : null, updated_at: nowIso }).eq("id", p.id);
    setPacientes(prev => prev.map(x => x.id === p.id ? { ...x, modo_humano: nuevo, updated_at: nowIso } : x));
    setSaving(null);
  };
  const toggleExp = (id: string) => setExpanded(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  const handlers: CardHandlers = { expanded, toggleExp, notasTemp, setNotasTemp, saving, setResultado, guardarNotas, toggleCandado };

  // Clasificación: el anuncio manda; si no, la mención de Sara; si no, la confirmación manual de la asesora.
  // Un "No es de Sara" manual saca a la persona aunque haya escrito "Sara" (p. ej. habla de otra Sara).
  const origenDe = (p: Pac): Origen | null => {
    const perfil = p.perfil_paciente || {};
    if (adIds.includes(String(perfil.anuncio_id))) return "anuncio";
    if (perfil.colab_sara === false) return null;
    if (perfil.promo === "SARA" || idsMencion.has(p.id)) return "contenido";
    if (perfil.colab_sara === true) return "confirmado";
    return perfil.origen_lead === "organico" ? "sin_confirmar" : null;
  };
  const conOrigen = pacientes.map(p => ({ p, origen: origenDe(p) }));
  const porGrupo: Record<Grupo, { p: Pac; origen: Origen }[]> = {
    campana:   conOrigen.filter(f => f.origen === "anuncio") as { p: Pac; origen: Origen }[],
    organico:  conOrigen.filter(f => f.origen === "contenido" || f.origen === "confirmado") as { p: Pac; origen: Origen }[],
    confirmar: conOrigen.filter(f => f.origen === "sin_confirmar") as { p: Pac; origen: Origen }[],
  };
  const descartados = pacientes.filter(p => p.perfil_paciente?.colab_sara === false && !adIds.includes(String(p.perfil_paciente?.anuncio_id))).length;

  const rCampana = resumen(porGrupo.campana.map(f => f.p));
  const rOrganico = resumen(porGrupo.organico.map(f => f.p));
  const rTotal = resumen([...porGrupo.campana, ...porGrupo.organico].map(f => f.p));
  const pct = (n: number, de: number) => de ? `${Math.round((n / de) * 100)}%` : "—";
  const costo = (n: number) => n && gasto ? COP(gasto / n) : "—";

  const lista = porGrupo[grupo];
  const conteoEtapa = (key: string) => lista.filter(f => etapaDe(f.p) === key).length;
  const visibles = lista.filter(f => (filtro === null || etapaDe(f.p) === filtro) && coincideBusqueda(f.p, busqueda));
  const grupoActual = GRUPOS.find(g => g.key === grupo)!;

  const embudo = [
    { label: "Llegaron", valor: rTotal.llegaron, icon: Users, color: "#22D3EE" },
    { label: "Entregados a la asesora", valor: rTotal.entregados, icon: PhoneCall, color: "#4C8DFF" },
    { label: "Agendaron valoración", valor: rTotal.agendaron, icon: CalendarCheck, color: "#C084FC" },
    { label: "Asistieron", valor: rTotal.asistieron, icon: CheckCircle, color: "#34D399" },
  ];

  const botonSara = (label: string, color: string, onClick: () => void, Icon: React.ElementType, disabled: boolean) => (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
      style={{ background: `${color}14`, color, border: `1px solid ${color}40`, opacity: disabled ? 0.5 : 1 }}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );

  // Resultados de un grupo (campaña u orgánico) en una tarjeta, para comparar los dos lado a lado
  const tarjetaGrupo = (g: Grupo, r: ReturnType<typeof resumen>, pie: React.ReactNode) => {
    const def = GRUPOS.find(x => x.key === g)!;
    const filas: [string, number][] = [["Entregados a la asesora", r.entregados], ["Agendaron valoración", r.agendaron], ["Asistieron", r.asistieron]];
    return (
      <div className="dm-card p-4">
        <div className="flex items-center gap-2 mb-2"><def.icon className="w-4 h-4" style={{ color: def.color }} /><span className="text-sm" style={{ color: "var(--text-2)" }}>{def.label}</span></div>
        <p className="text-3xl font-semibold" style={{ color: "var(--text)" }}>{r.llegaron} <span className="text-sm font-normal" style={{ color: "var(--text-3)" }}>personas</span></p>
        <div className="mt-3 space-y-1.5">
          {filas.map(([label, n]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--text-3)" }}>{label}</span>
              <span style={{ color: "var(--text)" }}>{n} <span style={{ color: "var(--text-3)" }}>· {pct(n, r.llegaron)}</span></span>
            </div>
          ))}
        </div>
        <p className="text-[13px] mt-3" style={{ color: "var(--text-3)" }}>{pie}</p>
      </div>
    );
  };

  // Encabezado de cada tarjeta: de dónde vino, cuándo llegó y la confirmación manual.
  // Es una función (no un componente) para que la tarjeta no se vuelva a montar en cada render y la nota no pierda el foco.
  const persona = (p: Pac, origen: Origen) => {
    const isSaving = saving === p.id;
    return (
      <div key={p.id} className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap px-1">
          <p className="text-[13px]">
            <span style={{ color: ORIGEN[origen].color }}>{ORIGEN[origen].label}</span>
            <span style={{ color: "var(--text-3)" }}> · llegó el {format(new Date(p.created_at), "d MMM · h:mm a", { locale: es })}</span>
          </p>
          <div className="flex items-center gap-2">
            {origen === "sin_confirmar" && <>
              {botonSara("Es de Sara", "#34D399", () => marcarSara(p, true), Check, isSaving)}
              {botonSara("No es de Sara", "#EF4444", () => marcarSara(p, false), X, isSaving)}
            </>}
            {origen === "contenido" && botonSara("No es de Sara", "#EF4444", () => marcarSara(p, false), X, isSaving)}
            {origen === "confirmado" && botonSara("Quitar confirmación", "#94A3B8", () => marcarSara(p, null), X, isSaving)}
          </div>
        </div>
        <CardOtro p={p} h={handlers} />
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="section-label mb-2">Colaboración</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)" }}>
            Sara Pinzón · @saraigram
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            Invisalign · desde el {format(new Date(INICIO_ISO), "EEEE d 'de' MMMM, h:mm a", { locale: es })}, cuando Sara publicó
          </p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(6,182,212,0.2)", borderTopColor: "var(--cyan)" }} /></div>
      ) : (
        <>
          {/* 1 · Total de la colaboración (campaña + orgánico de Sara) */}
          <div>
            <p className="section-label mb-2">Total de la colaboración · campaña + orgánico</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {embudo.map(({ label, valor, icon: Icon, color }) => (
                <div key={label} className="dm-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4" style={{ color }} />
                    <span className="text-sm" style={{ color: "var(--text-2)" }}>{label}</span>
                  </div>
                  <p className="number-hero" style={{ color }}>{valor}</p>
                  <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>{label === "Llegaron" ? "personas" : `${pct(valor, rTotal.llegaron)} de las que llegaron`}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 2 · Campaña vs. orgánico, lado a lado */}
          <div>
            <p className="section-label mb-2">Por origen</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {tarjetaGrupo("campana", rCampana, `${costo(rCampana.llegaron)} por persona · ${costo(rCampana.agendaron)} por agendado`)}
              {tarjetaGrupo("organico", rOrganico, `${porGrupo.organico.filter(f => f.origen === "contenido").length} escribieron “Sara” · ${porGrupo.organico.filter(f => f.origen === "confirmado").length} confirmados por la asesora · sin costo de pauta`)}
              <div className="dm-card p-4">
                <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4" style={{ color: "#FBBF24" }} /><span className="text-sm" style={{ color: "var(--text-2)" }}>Inversión en pauta</span></div>
                <p className="text-3xl font-semibold" style={{ color: "var(--text)" }}>{COP(gasto)}</p>
                <p className="text-sm mt-3" style={{ color: "var(--text-3)" }}>
                  Contando también el orgánico de Sara: {costo(rTotal.llegaron)} por persona · {costo(rTotal.agendaron)} por agendado · {costo(rTotal.asistieron)} por asistencia
                </p>
                <p className="text-[13px] mt-3" style={{ color: "var(--text-3)" }}>
                  {gastoHasta ? `Gasto de Meta sincronizado hasta el ${format(new Date(gastoHasta + "T12:00:00"), "d MMM", { locale: es })}` : "Aún sin gasto sincronizado"}
                </p>
              </div>
            </div>
          </div>

          {/* 3 · Personas, separadas por origen */}
          <div className="space-y-3">
            <p className="section-label">Personas · llama, escribe y registra el resultado (queda guardado en el CRM)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {GRUPOS.map(({ key, label, color, icon: Icon }) => {
                const activo = grupo === key;
                return (
                  <button key={key} onClick={() => { setGrupo(key); setFiltro(null); }}
                    className="flex items-center justify-between gap-2 px-4 py-3 rounded-2xl transition-all"
                    style={{
                      background: activo ? `linear-gradient(160deg, ${color}28, ${color}0a)` : `${color}0c`,
                      border: `1px solid ${activo ? `${color}55` : `${color}20`}`,
                    }}>
                    <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: activo ? color : "var(--text-2)" }}>
                      <Icon className="w-4 h-4" /> {label}
                    </span>
                    <span className="text-xl font-black" style={{ color: activo ? color : "var(--text-2)" }}>{porGrupo[key].length}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
              {grupoActual.desc}.
              {grupo === "confirmar" && ` Antes de la colaboración llegaban ${promedioAntes.toFixed(1)} orgánicos por día. Al llamarlos, pregunta cómo conocieron al doctor y márcalos con “Es de Sara” o “No es de Sara”.${descartados > 0 ? ` ${descartados} ya descartados.` : ""}`}
            </p>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-3)" }} />
              <input type="text" placeholder="Buscar por nombre o teléfono..." value={busqueda}
                onChange={e => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </div>

            <div className="flex flex-wrap gap-2">
              {[{ key: null as string | null, label: "Todas", color: grupoActual.color, n: lista.length }, ...FILTROS.map(f => ({ ...f, n: conteoEtapa(f.key) })).filter(f => f.n > 0)].map(f => {
                const activo = filtro === f.key;
                return (
                  <button key={f.key ?? "todas"} onClick={() => setFiltro(f.key)}
                    className="px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all"
                    style={{ background: activo ? `${f.color}22` : "rgba(255,255,255,0.04)", color: activo ? f.color : "var(--text-2)", border: `1px solid ${activo ? `${f.color}55` : "var(--border)"}` }}>
                    {f.label} · {f.n}
                  </button>
                );
              })}
            </div>

            {visibles.length === 0 ? (
              <div className="dm-card text-center py-10">
                <Users className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-3)" }} />
                <p className="text-sm" style={{ color: "var(--text-3)" }}>No hay personas en esta lista</p>
              </div>
            ) : (
              <div className="space-y-4">{visibles.map(f => persona(f.p, f.origen))}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
