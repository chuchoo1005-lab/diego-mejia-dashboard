"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { TrendingUp, DollarSign, Users, Target, RefreshCw } from "lucide-react";
import { PRECIOS, PRECIO_DEFAULT, COP } from "@/lib/precios";

interface CampanaRow {
  campaign_id: string; campaign_name: string;
  spend: number; impressions: number; clicks: number; leadsMeta: number;
  contactos: number; calificados: number; cerrados: number; asistio: number;
  ingresoEstimado: number;
}
interface DayPoint { fecha: string; gasto: number; contactos: number; }
type RangoKey = "mes" | "30d";

export default function ROIPage() {
  const [rango, setRango] = useState<RangoKey>("mes");
  const [campanas, setCampanas] = useState<CampanaRow[]>([]);
  const [dayData, setDayData] = useState<DayPoint[]>([]);
  const [conversaciones, setConversaciones] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const hoy = new Date();
    const desde = rango === "mes" ? startOfMonth(hoy) : subDays(hoy, 29);
    desde.setHours(0, 0, 0, 0);
    const desdeISO = desde.toISOString();
    const desdeFecha = format(desde, "yyyy-MM-dd");

    const [{ data: ads }, { data: pacs }, { count: convs }] = await Promise.all([
      supabase.from("meta_ads_diario").select("fecha,ad_id,campaign_id,campaign_name,spend_cop,impressions,clicks,leads_meta").gte("fecha", desdeFecha),
      supabase.from("pacientes").select("created_at,calificado,perfil_paciente").not("perfil_paciente->>anuncio_id", "is", null).gte("created_at", desdeISO),
      supabase.from("conversaciones").select("*", { count: "exact", head: true }).gte("timestamp", desdeISO),
    ]);

    const porAd: Record<string, { campaign_id: string; campaign_name: string; spend: number; impressions: number; clicks: number; leadsMeta: number }> = {};
    const porDiaSpend: Record<string, number> = {};
    (ads || []).forEach(a => {
      const cur = porAd[a.ad_id] || { campaign_id: a.campaign_id, campaign_name: a.campaign_name, spend: 0, impressions: 0, clicks: 0, leadsMeta: 0 };
      cur.spend += Number(a.spend_cop) || 0;
      cur.impressions += a.impressions || 0;
      cur.clicks += a.clicks || 0;
      cur.leadsMeta += a.leads_meta || 0;
      porAd[a.ad_id] = cur;
      porDiaSpend[a.fecha] = (porDiaSpend[a.fecha] || 0) + (Number(a.spend_cop) || 0);
    });

    const contactosPorAd: Record<string, { total: number; calificados: number; cerrados: number; asistio: number; ingreso: number }> = {};
    const porDiaContactos: Record<string, number> = {};
    (pacs || []).forEach(p => {
      const perfil = p.perfil_paciente as Record<string, unknown>;
      const adId = perfil?.anuncio_id as string;
      if (!adId) return;
      const cur = contactosPorAd[adId] || { total: 0, calificados: 0, cerrados: 0, asistio: 0, ingreso: 0 };
      cur.total++;
      if (p.calificado) cur.calificados++;
      const resultado = (perfil?.resultado_llamada as string) || "";
      if (resultado === "cerrado") cur.cerrados++;
      if (resultado === "asistio") cur.asistio++;
      if (resultado === "cerrado" || resultado === "asistio") {
        const srv = perfil?.servicio_interes as string;
        cur.ingreso += (srv && PRECIOS[srv]) || PRECIO_DEFAULT;
      }
      contactosPorAd[adId] = cur;
      const dia = format(new Date(p.created_at as string), "yyyy-MM-dd");
      porDiaContactos[dia] = (porDiaContactos[dia] || 0) + 1;
    });

    const porCampana: Record<string, CampanaRow> = {};
    Object.entries(porAd).forEach(([adId, a]) => {
      const c = contactosPorAd[adId] || { total: 0, calificados: 0, cerrados: 0, asistio: 0, ingreso: 0 };
      const cur = porCampana[a.campaign_id] || { campaign_id: a.campaign_id, campaign_name: a.campaign_name, spend: 0, impressions: 0, clicks: 0, leadsMeta: 0, contactos: 0, calificados: 0, cerrados: 0, asistio: 0, ingresoEstimado: 0 };
      cur.spend += a.spend; cur.impressions += a.impressions; cur.clicks += a.clicks; cur.leadsMeta += a.leadsMeta;
      cur.contactos += c.total; cur.calificados += c.calificados; cur.cerrados += c.cerrados; cur.asistio += c.asistio; cur.ingresoEstimado += c.ingreso;
      porCampana[a.campaign_id] = cur;
    });
    setCampanas(Object.values(porCampana).sort((a, b) => b.spend - a.spend));

    const dias: DayPoint[] = [];
    const totalDias = Math.max(1, Math.round((hoy.getTime() - desde.getTime()) / 86400000) + 1);
    for (let i = 0; i < totalDias; i++) {
      const d = new Date(desde); d.setDate(d.getDate() + i);
      const key = format(d, "yyyy-MM-dd");
      dias.push({ fecha: format(d, "d MMM", { locale: es }), gasto: porDiaSpend[key] || 0, contactos: porDiaContactos[key] || 0 });
    }
    setDayData(dias);
    setConversaciones(convs || 0);
    setLoading(false);
  }, [rango]);

  useEffect(() => { load(); }, [load]);

  const totales = campanas.reduce((acc, c) => ({
    spend: acc.spend + c.spend,
    contactos: acc.contactos + c.contactos,
    cierres: acc.cierres + c.cerrados + c.asistio,
    ingreso: acc.ingreso + c.ingresoEstimado,
  }), { spend: 0, contactos: 0, cierres: 0, ingreso: 0 });
  const roas = totales.spend > 0 ? totales.ingreso / totales.spend : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="section-label mb-2">Análisis financiero</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)" }}>
            Rendimiento de Pauta
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            Gasto real de Meta Ads cruzado contra el pipeline de leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {(["mes", "30d"] as RangoKey[]).map(r => (
              <button key={r} onClick={() => setRango(r)} className="px-3 py-2 text-sm font-medium"
                style={{ background: rango === r ? "rgba(6,182,212,0.15)" : "transparent", color: rango === r ? "var(--cyan)" : "var(--text-3)" }}>
                {r === "mes" ? "Este mes" : "Últimos 30 días"}
              </button>
            ))}
          </div>
          <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(6,182,212,0.2)", borderTopColor: "var(--cyan)" }} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Gasto en pauta", value: COP(totales.spend), sub: `${campanas.length} campaña(s) con gasto`, icon: DollarSign, color: "#FFB454" },
              { label: "Contactos reales", value: totales.contactos.toString(), sub: "Llegaron a WhatsApp", icon: Users, color: "#2FE0E8" },
              { label: "Agendaron/asistieron", value: totales.cierres.toString(), sub: totales.contactos > 0 ? `${Math.round(totales.cierres / totales.contactos * 100)}% de contactos` : "—", icon: Target, color: "#A78BFA" },
              { label: "ROAS estimado", value: `${roas.toFixed(1)}x`, sub: "Ingreso estimado / gasto", icon: TrendingUp, color: "#2FD0A0" },
            ].map(m => (
              <div key={m.label} className="p-5 rounded-2xl" style={{ background: `linear-gradient(160deg, ${m.color}1c, rgba(255,255,255,0.03) 55%)`, border: `1px solid ${m.color}28` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${m.color}22` }}>
                  <m.icon className="w-4 h-4" style={{ color: m.color }} />
                </div>
                <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-sm font-medium mt-1" style={{ color: "var(--text)" }}>{m.label}</p>
                <p className="text-[14px] mt-0.5" style={{ color: "var(--text-3)" }}>{m.sub}</p>
              </div>
            ))}
          </div>

          <div className="dm-card p-5">
            <p className="section-label mb-1">Tendencia diaria</p>
            <h2 className="font-semibold mb-5" style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", color: "var(--text)" }}>
              Gasto vs. contactos nuevos
            </h2>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dayData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cG2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="gasto" name="Gasto (COP)" stroke="#F59E0B" strokeWidth={2} fill="url(#gG)" />
                  <Area type="monotone" dataKey="contactos" name="Contactos" stroke="#06B6D4" strokeWidth={1.5} fill="url(#cG2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="dm-card p-5">
            <p className="section-label mb-1">Por campaña</p>
            <h2 className="font-semibold mb-4" style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.1rem", color: "var(--text)" }}>
              Rendimiento real por campaña
            </h2>
            {campanas.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-3)" }}>Sin gasto registrado en este periodo todavía.</p>
            ) : (
              <div className="space-y-3">
                {campanas.map(c => {
                  const cierres = c.cerrados + c.asistio;
                  const cpl = c.leadsMeta > 0 ? c.spend / c.leadsMeta : 0;
                  const costoContacto = c.contactos > 0 ? c.spend / c.contactos : 0;
                  const costoCierre = cierres > 0 ? c.spend / cierres : 0;
                  const roasC = c.spend > 0 ? c.ingresoEstimado / c.spend : 0;
                  return (
                    <div key={c.campaign_id} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{c.campaign_name}</p>
                        <p className="text-sm font-black" style={{ color: "var(--green)" }}>{COP(c.spend)}</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div><p style={{ color: "var(--text-3)" }}>CPL (Meta)</p><p className="font-bold" style={{ color: "var(--text)" }}>{cpl > 0 ? COP(cpl) : "—"}</p></div>
                        <div><p style={{ color: "var(--text-3)" }}>Costo/contacto real</p><p className="font-bold" style={{ color: "var(--text)" }}>{costoContacto > 0 ? COP(costoContacto) : "—"}</p></div>
                        <div><p style={{ color: "var(--text-3)" }}>Contactos → cierres</p><p className="font-bold" style={{ color: "var(--text)" }}>{c.contactos} → {cierres}</p></div>
                        <div><p style={{ color: "var(--text-3)" }}>Costo/cierre</p><p className="font-bold" style={{ color: "var(--text)" }}>{costoCierre > 0 ? COP(costoCierre) : "—"}</p></div>
                      </div>
                      <div className="mt-2 text-sm" style={{ color: "var(--text-3)" }}>
                        Ingreso estimado: <span className="font-bold" style={{ color: "var(--green)" }}>{COP(c.ingresoEstimado)}</span> · ROAS: <span className="font-bold" style={{ color: "var(--cyan)" }}>{roasC.toFixed(1)}x</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="dm-card-glow p-5">
            <p className="section-label mb-3" style={{ color: "rgba(6,182,212,0.5)" }}>Valor del sistema IA</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Conversaciones procesadas", calc: "Por el agente IA automáticamente", value: conversaciones.toLocaleString("es-CO") },
                { label: "Disponibilidad 24/7", calc: "El agente responde fuera del horario de oficina", value: "∞" },
                { label: "Seguimientos automáticos", calc: "Sin olvidar leads. WF-07 corre cada 2 min", value: "100%" },
              ].map(({ label, calc, value }) => (
                <div key={label} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-lg font-black mb-1" style={{ color: "var(--cyan)" }}>{value}</p>
                  <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--text)" }}>{label}</p>
                  <p className="text-[14px]" style={{ color: "var(--text-3)" }}>{calc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-center" style={{ color: "var(--text-3)", fontFamily: "var(--font-cormorant)", fontStyle: "italic" }}>
            El ingreso es una estimación por tipo de tratamiento cotizado por el bot, no el monto real facturado.
            El gasto y los leads reportados por Meta sí son datos reales, sincronizados diariamente desde la API.
          </p>
        </>
      )}
    </div>
  );
}
