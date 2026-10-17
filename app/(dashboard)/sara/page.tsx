"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, Users, Megaphone, Sparkles, PhoneCall, CalendarCheck, CheckCircle, DollarSign } from "lucide-react";
import { MAP_A_ETAPA, etapaInfo, displayName, formatTel, SRV, Paciente } from "@/components/CallCard";
import { COP } from "@/lib/precios";

// Colaboración con Sara Pinzón (@saraigram): campaña "PRO | Ortodoncia Invisible | Colab SARA | Oct2026".
// Un lead cuenta como de Sara si llegó desde un anuncio de esa campaña, o si el bot lo marcó con promo = "SARA"
// (escribió la palabra SARA en sus primeros mensajes, p. ej. desde las historias de ella).
// Solo se cuentan leads creados desde el inicio de la colaboración, para no mezclar pacientes viejos que se llaman Sara.
const INICIO = "2026-10-16";
const INICIO_ISO = "2026-10-16T05:00:00Z"; // 00:00 hora Bogotá
const SARA_AD_IDS = ["120250406897410109"]; // respaldo mientras WF-12 sincroniza el gasto del día
const ETAPAS_AGENDO = ["cerrados", "asistio", "no_asistio", "reprogramo"];
const PALABRA_SARA = /(^|[^a-záéíóúñ])sara([^a-záéíóúñ]|$)/i; // "Sara" como palabra suelta (no Saray, Sarai)
const BASE_DESDE_ISO = "2026-10-01T05:00:00Z"; // promedio de orgánicos antes de la colaboración (1–15 oct)
const BASE_DIAS = 15;

interface Fila { p: Paciente; created_at: string; origen: "anuncio" | "contenido" | "sin_confirmar"; etapa: string; }

const ORIGEN: Record<Fila["origen"], { label: string; color: string }> = {
  anuncio:       { label: "Anuncio pagado",      color: "var(--cyan)" },
  contenido:     { label: "Mencionó a Sara",     color: "#C084FC" },
  sin_confirmar: { label: "Orgánico sin confirmar", color: "var(--text-3)" },
};

function ListaPersonas({ titulo, nota, filas }: { titulo: string; nota?: string; filas: Fila[] }) {
  return (
    <div className="dm-card overflow-hidden">
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="section-label">{titulo} ({filas.length})</p>
        {nota && <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>{nota}</p>}
      </div>
      {filas.length === 0 ? (
        <div className="text-center py-10">
          <Users className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-3)" }} />
          <p className="text-sm" style={{ color: "var(--text-3)" }}>No hay personas en esta lista</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {filas.map(f => {
            const resultado = (f.p.perfil_paciente?.resultado_llamada as string) || "";
            const info = etapaInfo(resultado);
            const servicio = f.p.perfil_paciente?.servicio_interes as string | undefined;
            const entregado = !!resultado || f.p.perfil_paciente?.notificado_asesora === true;
            return (
              <div key={f.p.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[160px]">
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{displayName(f.p)}</p>
                  <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
                    {formatTel(f.p.telefono_encriptado)} · {format(new Date(f.created_at), "d MMM · h:mm a", { locale: es })} · {servicio ? (SRV[servicio] ?? servicio) : "Sin servicio"}
                  </p>
                </div>
                <span className="text-[13px]" style={{ color: ORIGEN[f.origen].color }}>{ORIGEN[f.origen].label}</span>
                <span className="text-[13px] font-semibold" style={{ color: entregado ? info.color : "var(--text-3)" }}>
                  {entregado ? `${info.icon} ${info.label}` : "Conversando con el bot"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SaraPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [gasto, setGasto] = useState(0);
  const [gastoHasta, setGastoHasta] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sinConfirmar, setSinConfirmar] = useState<Fila[]>([]);
  const [promedioAntes, setPromedioAntes] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: ads } = await supabase.from("meta_ads_diario")
      .select("fecha,ad_id,spend_cop").ilike("campaign_name", "%SARA%").gte("fecha", INICIO);
    const adIds = Array.from(new Set([...SARA_AD_IDS, ...(ads || []).map(a => String(a.ad_id))]));
    setGasto((ads || []).reduce((s, a) => s + (Number(a.spend_cop) || 0), 0));
    setGastoHasta((ads || []).map(a => a.fecha as string).sort().pop() || null);

    // Leads que escribieron "Sara" en el chat (incluye a los que llegaron por el wa.me de ella antes de que el bot marcara la palabra)
    const { data: menciones } = await supabase.from("conversaciones")
      .select("paciente_id,mensaje_encriptado").eq("direccion", "entrante").gte("timestamp", INICIO_ISO).ilike("mensaje_encriptado", "%sara%");
    const idsMencion = Array.from(new Set((menciones || []).filter(m => PALABRA_SARA.test(String(m.mensaje_encriptado || ""))).map(m => String(m.paciente_id))));

    const filtros = [`perfil_paciente->>promo.eq.SARA`, `perfil_paciente->>anuncio_id.in.(${adIds.join(",")})`];
    if (idsMencion.length) filtros.push(`id.in.(${idsMencion.join(",")})`);
    const { data: pacs } = await supabase.from("pacientes")
      .select("id,alias,calificado,telefono_encriptado,modo_humano,perfil_paciente,updated_at,created_at")
      .gte("created_at", INICIO_ISO)
      .or(filtros.join(","))
      .order("created_at", { ascending: false });

    // Orgánicos del período que NO mencionaron a Sara: se listan aparte (sin contar en el total) para revisarlos caso por caso
    const [{ data: orgPac }, { count: orgAntes }] = await Promise.all([
      supabase.from("pacientes").select("id,alias,calificado,telefono_encriptado,modo_humano,perfil_paciente,updated_at,created_at")
        .gte("created_at", INICIO_ISO).eq("perfil_paciente->>origen_lead", "organico").order("created_at", { ascending: false }),
      supabase.from("pacientes").select("id", { count: "exact", head: true }).gte("created_at", BASE_DESDE_ISO).lt("created_at", INICIO_ISO).eq("perfil_paciente->>origen_lead", "organico"),
    ]);
    const idsSara = new Set((pacs || []).map(r => String(r.id)));
    setPromedioAntes((orgAntes || 0) / BASE_DIAS);

    const aFila = (row: Record<string, unknown>, origen: Fila["origen"]): Fila => {
      const resultado = ((row.perfil_paciente as Record<string, unknown>)?.resultado_llamada as string) || "";
      return { p: row as unknown as Paciente, created_at: row.created_at as string, origen, etapa: resultado ? (MAP_A_ETAPA[resultado] || "") : "" };
    };
    setFilas((pacs || []).map(row => aFila(row, adIds.includes(String((row.perfil_paciente as Record<string, unknown>)?.anuncio_id)) ? "anuncio" : "contenido")));
    setSinConfirmar((orgPac || []).filter(row => !idsSara.has(String(row.id))).map(row => aFila(row, "sin_confirmar")));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = filas.length;
  const porAnuncio = filas.filter(f => f.origen === "anuncio").length;
  const porContenido = total - porAnuncio;
  const entregados = filas.filter(f => f.p.perfil_paciente?.notificado_asesora === true).length;
  const agendaron = filas.filter(f => ETAPAS_AGENDO.includes(f.etapa)).length;
  const asistieron = filas.filter(f => f.etapa === "asistio").length;
  const pct = (n: number) => total ? `${Math.round((n / total) * 100)}%` : "—";
  const costo = (n: number) => n && gasto ? COP(gasto / n) : "—";

  const embudo = [
    { label: "Llegaron", valor: total, icon: Users, color: "#22D3EE" },
    { label: "Entregados a la asesora", valor: entregados, icon: PhoneCall, color: "#4C8DFF" },
    { label: "Agendaron valoración", valor: agendaron, icon: CalendarCheck, color: "#C084FC" },
    { label: "Asistieron", valor: asistieron, icon: CheckCircle, color: "#34D399" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="section-label mb-2">Colaboración</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)" }}>
            Sara Pinzón · @saraigram
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            Invisalign · desde el {format(new Date(INICIO + "T12:00:00"), "d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(6,182,212,0.2)", borderTopColor: "var(--cyan)" }} /></div>
      ) : (
        <>
          {/* Embudo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {embudo.map(({ label, valor, icon: Icon, color }) => (
              <div key={label} className="dm-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span className="text-sm" style={{ color: "var(--text-2)" }}>{label}</span>
                </div>
                <p className="number-hero" style={{ color }}>{valor}</p>
                <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>{label === "Llegaron" ? "personas" : `${pct(valor)} de las que llegaron`}</p>
              </div>
            ))}
          </div>

          {/* Origen + inversión */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="dm-card p-4">
              <div className="flex items-center gap-2 mb-2"><Megaphone className="w-4 h-4" style={{ color: "var(--cyan)" }} /><span className="text-sm" style={{ color: "var(--text-2)" }}>Por el anuncio pagado</span></div>
              <p className="text-3xl font-semibold" style={{ color: "var(--text)" }}>{porAnuncio}</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>Tocaron el anuncio de la campaña</p>
            </div>
            <div className="dm-card p-4">
              <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4" style={{ color: "#C084FC" }} /><span className="text-sm" style={{ color: "var(--text-2)" }}>Por el contenido de Sara</span></div>
              <p className="text-3xl font-semibold" style={{ color: "var(--text)" }}>{porContenido}</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>Escribieron &ldquo;Sara&rdquo; en el chat, sin venir del anuncio</p>
            </div>
            <div className="dm-card p-4">
              <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4" style={{ color: "#FBBF24" }} /><span className="text-sm" style={{ color: "var(--text-2)" }}>Inversión en pauta</span></div>
              <p className="text-3xl font-semibold" style={{ color: "var(--text)" }}>{COP(gasto)}</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
                {costo(total)} por persona · {costo(agendaron)} por agendado · {costo(asistieron)} por asistencia
              </p>
              <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>
                {gastoHasta ? `Gasto de Meta sincronizado hasta el ${format(new Date(gastoHasta + "T12:00:00"), "d MMM", { locale: es })}` : "Aún sin gasto sincronizado"}
              </p>
            </div>
          </div>

          <ListaPersonas titulo="Personas confirmadas de Sara" nota="Son las que cuentan en las cifras de arriba: llegaron por el anuncio de la campaña o escribieron Sara en el chat." filas={filas} />
          <ListaPersonas titulo="Orgánicos sin confirmar" filas={sinConfirmar}
            nota={`Llegaron sin anuncio desde el inicio de la colaboración y no mencionaron a Sara. Antes llegaban ${promedioAntes.toFixed(1)} orgánicos por día. No se suman arriba: revisar caso por caso.`} />
        </>
      )}
    </div>
  );
}
