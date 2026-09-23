"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { SRV, MAP_A_ETAPA } from "@/components/CallCard";
import { PRECIOS, PRECIO_DEFAULT, COP } from "@/lib/precios";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, TrendingUp, MessageSquare, Users, Target, Phone, Trophy, CheckCircle2, AlertTriangle, Activity, DollarSign, ArrowRight } from "lucide-react";

interface DayData { fecha: string; conversaciones: number; pacientes: number; }
interface SegStep { paso: number; convirtio: number; cancelado: number; sinConversion: number; activo: number; total: number; }

type RangoKey = "7d" | "30d" | "90d";
const RANGOS: { key: RangoKey; label: string; dias: number }[] = [
  { key: "7d",  label: "7 días",  dias: 7 },
  { key: "30d", label: "30 días", dias: 30 },
  { key: "90d", label: "90 días", dias: 90 },
];

const COLORS = ["#06B6D4","#10B981","#F59E0B","#EF4444","#A78BFA"];

const Tip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-3 rounded-xl text-sm shadow-lg" style={{ background:"rgba(10,10,18,0.95)", border:"1px solid rgba(255,255,255,0.1)" }}>
      <p className="font-semibold mb-2" style={{ color:"rgba(255,255,255,0.5)" }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background:p.color }} />
          <span style={{ color:"rgba(255,255,255,0.5)" }}>{p.name}:</span>
          <span className="font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// Etapa "agendó" / "asistió" según el mismo criterio canónico de /citas (components/CallCard.tsx)
function esAgendo(resultado: string): boolean { return MAP_A_ETAPA[resultado] === "cerrados"; }
function esAsistio(resultado: string): boolean { return MAP_A_ETAPA[resultado] === "asistio"; }

export default function MetricasPage() {
  const [rango, setRango] = useState<RangoKey>("30d");
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [totales, setTotales] = useState({ pacientes:0, conversaciones:0, calificados:0, listos:0, agendaron:0, asistieron:0, tasaCierre:0, gasto:0, ingresoEstimado:0, roas:0 });
  const [servicios, setServicios] = useState<{ nombre:string; count:number; pct:number }[]>([]);
  const [funnel, setFunnel] = useState<{ label:string; value:number; pct:number }[]>([]);
  const [sla, setSla] = useState({ total:0, buckets:[0,0,0,0] });
  const [segSteps, setSegSteps] = useState<SegStep[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const dias = RANGOS.find(r => r.key === rango)!.dias;
    const desde = subDays(new Date(), dias - 1); desde.setHours(0, 0, 0, 0);
    const desdeISO = desde.toISOString();
    const desdeFecha = format(desde, "yyyy-MM-dd");

    const [{ data: pacs }, { data: convs }, { data: ads }] = await Promise.all([
      supabase.from("pacientes").select("id,created_at,calificado,perfil_paciente").eq("estado","activo").gte("created_at", desdeISO),
      supabase.from("conversaciones").select("timestamp").gte("timestamp", desdeISO),
      supabase.from("meta_ads_diario").select("spend_cop").gte("fecha", desdeFecha),
    ]);
    const gasto = (ads||[]).reduce((s,a)=>s+(Number(a.spend_cop)||0),0);

    // ─── Evolución temporal ────────────────────────────────────────────
    const days: Record<string,DayData> = {};
    for (let i=0;i<dias;i++) {
      const d = format(subDays(new Date(),dias-1-i),"yyyy-MM-dd");
      days[d] = { fecha:format(subDays(new Date(),dias-1-i),"d MMM",{locale:es}), conversaciones:0, pacientes:0 };
    }
    (pacs||[]).forEach(p=>{const d=format(new Date(p.created_at),"yyyy-MM-dd");if(days[d])days[d].pacientes++;});
    (convs||[]).forEach(c=>{const d=format(new Date(c.timestamp),"yyyy-MM-dd");if(days[d])days[d].conversaciones++;});
    setDayData(Object.values(days));

    // ─── KPIs, embudo, distribución de servicios, SLA y efectividad de seguimiento ──
    const total = (pacs||[]).length;
    let calificados=0, conConv=0, listos=0, listosSinProcesar=0, agendaron=0, asistieron=0;
    const srvCnt: Record<string,number> = {};
    const slaBuckets = [0,0,0,0]; // <6h, 6-24h, 24-48h, >48h
    let slaTotal = 0;
    const segByStep: Record<number, { convirtio:number; cancelado:number; sinConversion:number; activo:number; total:number }> = {};
    const now = Date.now();
    let ingresoEstimado = 0;

    (pacs||[]).forEach(p => {
      const perfil = p.perfil_paciente as Record<string, unknown>;
      const estadoConv = (perfil?.estado_conv as string) || "nuevo";
      const resultado = (perfil?.resultado_llamada as string) || "";
      const estadoSeg = (perfil?.estado_seguimiento as string) || "pendiente";
      const numSeg = parseInt(String(perfil?.seguimientos_enviados ?? "0")) || 0;
      const srv = perfil?.servicio_interes as string;

      if (p.calificado) calificados++;
      if (estadoConv !== "nuevo") conConv++;
      if (estadoConv === "entrega_premium") {
        listos++;
        if (!resultado) {
          listosSinProcesar++;
          const ua = (perfil?.ultima_actividad_at as string) ? new Date(perfil.ultima_actividad_at as string) : new Date(p.created_at as string);
          const horas = (now - ua.getTime()) / 3600000;
          slaTotal++;
          if (horas < 6) slaBuckets[0]++; else if (horas < 24) slaBuckets[1]++; else if (horas < 48) slaBuckets[2]++; else slaBuckets[3]++;
        }
      }
      if (esAgendo(resultado)) agendaron++;
      if (esAsistio(resultado)) asistieron++;
      if (esAgendo(resultado) || esAsistio(resultado)) ingresoEstimado += (srv && PRECIOS[srv]) || PRECIO_DEFAULT;
      if (srv) srvCnt[srv] = (srvCnt[srv]||0) + 1;

      if (numSeg > 0) {
        const bucket = segByStep[numSeg] || { convirtio:0, cancelado:0, sinConversion:0, activo:0, total:0 };
        bucket.total++;
        if (esAgendo(resultado) || esAsistio(resultado)) bucket.convirtio++;
        else if (estadoSeg === "cancelado") bucket.cancelado++;
        else if (estadoSeg === "activo") bucket.activo++;
        else bucket.sinConversion++;
        segByStep[numSeg] = bucket;
      }
    });

    setTotales({
      pacientes: total, conversaciones: (convs||[]).length, calificados, listos: listosSinProcesar,
      agendaron, asistieron, tasaCierre: calificados>0 ? Math.round(((agendaron+asistieron)/calificados)*100) : 0,
      gasto, ingresoEstimado, roas: gasto>0 ? Math.round((ingresoEstimado/gasto)*10)/10 : 0,
    });
    setSla({ total: slaTotal, buckets: slaBuckets });
    setSegSteps(Object.entries(segByStep).map(([paso,b]) => ({ paso:parseInt(paso), ...b })).sort((a,b)=>a.paso-b.paso));

    const srvTotal = Object.values(srvCnt).reduce((a,b)=>a+b,0);
    setServicios(Object.entries(srvCnt).map(([n,c])=>({nombre:n,count:c,pct:srvTotal>0?Math.round((c/srvTotal)*100):0})).sort((a,b)=>b.count-a.count));

    setFunnel([
      { label:"Total leads",          value:total,              pct:100 },
      { label:"Con conversación",     value:conConv,            pct:total>0?Math.round((conConv/total)*100):0 },
      { label:"Calificados",          value:calificados,        pct:total>0?Math.round((calificados/total)*100):0 },
      { label:"Listos para valorar",  value:listos,              pct:total>0?Math.round((listos/total)*100):0 },
      { label:"Agendó valoración",    value:agendaron,          pct:total>0?Math.round((agendaron/total)*100):0 },
      { label:"Asistió a la cita",    value:asistieron,         pct:total>0?Math.round((asistieron/total)*100):0 },
    ]);
    setLoading(false);
  }, [rango]);

  useEffect(()=>{load();},[load]);

  const slaColors = ["#2FD0A0","#FFB454","#FB923C","#FF5F6D"];
  const slaLabels = ["< 6 horas","6 - 24 horas","24 - 48 horas","+ 48 horas"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="section-label mb-2">Análisis y reportes</p>
          <h1 style={{fontFamily:"var(--font-cormorant)",fontSize:"2rem",fontWeight:500,color:"var(--text)"}}>Métricas</h1>
          <p className="text-sm mt-1" style={{color:"var(--text-3)"}}>Embudo, SLA de respuesta y efectividad de seguimiento · Tiempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {RANGOS.map(r => (
              <button key={r.key} onClick={() => setRango(r.key)} className="px-3 py-2 text-sm font-medium"
                style={{ background: rango === r.key ? "rgba(6,182,212,0.15)" : "transparent", color: rango === r.key ? "var(--cyan)" : "var(--text-3)" }}>
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
            style={{background:"rgba(255,255,255,0.05)",border:"1px solid var(--border)",color:"var(--text-2)"}}>
            <RefreshCw className="w-3.5 h-3.5"/> Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          {label:"Total leads",         value:totales.pacientes,                icon:Users,        color:"#2FE0E8"},
          {label:"Calificados",         value:totales.calificados,              icon:Target,       color:"#FFB454"},
          {label:"Listos sin procesar", value:totales.listos,                   icon:Phone,        color:"#FF5F6D"},
          {label:"Agendaron",           value:totales.agendaron,                icon:Trophy,       color:"#4C8DFF"},
          {label:"Asistieron",          value:totales.asistieron,               icon:CheckCircle2, color:"#A78BFA"},
          {label:"Tasa de cierre real", value:`${totales.tasaCierre}%`,         icon:TrendingUp,   color:"#2FD0A0", highlight:true},
        ].map(({label,value,icon:Icon,color,highlight})=>(
          <div key={label} className="p-4 rounded-2xl" style={{
            background: `linear-gradient(160deg, ${color}1c, rgba(255,255,255,0.03) 55%)`,
            border: `1px solid ${highlight ? `${color}55` : `${color}28`}`,
            boxShadow: highlight ? `0 0 20px ${color}20` : "none",
          }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{background:`${color}22`}}>
              <Icon className="w-3.5 h-3.5" style={{color}}/>
            </div>
            <p className="text-xl font-black" style={{color}}>{value}</p>
            <p className="text-[14px] mt-0.5" style={{color:"var(--text-3)"}}>{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{borderColor:"rgba(6,182,212,0.2)",borderTopColor:"var(--cyan)"}}/></div>
      ) : (
        <>
          {/* Gasto e ingreso — siempre visible, detalle por campaña en /roi */}
          <div className="dm-card-glow p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" style={{ color: "var(--amber)" }} />
                <p className="section-label" style={{ margin: 0, color: "rgba(245,158,11,0.6)" }}>Gasto e ingreso</p>
              </div>
              <Link href="/roi" className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--cyan)" }}>
                Ver detalle por campaña <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {totales.gasto === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-3)" }}>
                Sin gasto de Meta Ads registrado en este periodo todavía — la sincronización diaria (WF-12) está activa, los datos se irán acumulando.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-2xl font-black" style={{ color: "var(--amber)" }}>{COP(totales.gasto)}</p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>Gasto en pauta</p>
                </div>
                <div>
                  <p className="text-2xl font-black" style={{ color: "var(--green)" }}>{COP(totales.ingresoEstimado)}</p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>Ingreso estimado (agendó + asistió)</p>
                </div>
                <div>
                  <p className="text-2xl font-black" style={{ color: "var(--cyan)" }}>{totales.roas.toFixed(1)}x</p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>ROAS estimado</p>
                </div>
              </div>
            )}
          </div>

          {/* Embudo de conversión completo */}
          <div className="dm-card p-5">
            <p className="section-label mb-1">Embudo completo</p>
            <h2 className="font-semibold mb-5" style={{fontFamily:"var(--font-cormorant)",fontSize:"1.1rem",color:"var(--text)"}}>
              Pipeline de admisión, de lead a paciente
            </h2>
            <div className="space-y-3">
              {funnel.map(({label,value,pct},i)=>{
                const colors=["rgba(255,255,255,0.15)","#A78BFA","#FFB454","#2FE0E8","#2FD0A0","#8B5CF6"];
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-black w-5" style={{color:"var(--text-3)"}}>0{i+1}</span>
                        <span className="text-sm font-medium" style={{color:"var(--text)"}}>{label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold" style={{color:"var(--text)"}}>{value}</span>
                        <span className="text-[14px] w-10 text-right" style={{color:"var(--text-3)"}}>{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full" style={{background:"rgba(255,255,255,0.05)"}}>
                      <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:colors[i],boxShadow:i>2?`0 0 8px ${colors[i]}50`:"none"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SLA de respuesta humana */}
          <div className="dm-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4" style={{ color: "var(--red)" }} />
              <p className="section-label" style={{ margin: 0 }}>SLA de respuesta humana</p>
            </div>
            <h2 className="font-semibold mb-1" style={{fontFamily:"var(--font-cormorant)",fontSize:"1.1rem",color:"var(--text)"}}>
              Leads listos para llamar, sin resultado registrado
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--text-3)" }}>
              {sla.total > 0
                ? `${sla.total} lead(s) esperando que la asesora los procese.`
                : "Todos los leads listos ya tienen un resultado de llamada registrado."}
            </p>
            {sla.total > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {slaLabels.map((label,i)=>{
                  const val = sla.buckets[i];
                  const pct = sla.total>0 ? Math.round((val/sla.total)*100) : 0;
                  return (
                    <div key={label} className="p-3 rounded-xl" style={{ background:"rgba(255,255,255,0.025)", border:`1px solid ${slaColors[i]}30` }}>
                      <p className="text-lg font-black" style={{ color: slaColors[i] }}>{val}</p>
                      <p className="text-[13px] mt-0.5" style={{ color:"var(--text-3)" }}>{label}</p>
                      <div className="h-1.5 rounded-full mt-2" style={{ background:"rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full" style={{ width:`${pct}%`, background: slaColors[i] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Efectividad de seguimiento del bot (WF-07) */}
          <div className="dm-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4" style={{ color: "var(--cyan)" }} />
              <p className="section-label" style={{ margin: 0 }}>Efectividad de seguimiento automático</p>
            </div>
            <h2 className="font-semibold mb-5" style={{fontFamily:"var(--font-cormorant)",fontSize:"1.1rem",color:"var(--text)"}}>
              Qué pasa con los leads en cada paso del plan del bot
            </h2>
            {segSteps.length === 0 ? (
              <p className="text-sm" style={{ color:"var(--text-3)" }}>Sin leads en seguimiento automático en este periodo.</p>
            ) : (
              <div className="space-y-3">
                {segSteps.map(({paso,convirtio,cancelado,sinConversion,activo,total})=>(
                  <div key={paso} className="p-3 rounded-xl" style={{ background:"rgba(255,255,255,0.025)", border:"1px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold" style={{ color:"var(--text)" }}>Paso {paso}</span>
                      <span className="text-[13px]" style={{ color:"var(--text-3)" }}>{total} lead(s)</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label:"Convirtió", value:convirtio, color:"var(--green)" },
                        { label:"Sigue activo", value:activo, color:"var(--cyan)" },
                        { label:"Sin conversión", value:sinConversion, color:"var(--text-3)" },
                        { label:"Canceló", value:cancelado, color:"var(--red)" },
                      ].map(m=>(
                        <div key={m.label}>
                          <p className="text-sm font-black" style={{ color:m.color }}>{m.value}</p>
                          <p className="text-[12px]" style={{ color:"var(--text-3)" }}>{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gráfico conversaciones */}
          <div className="dm-card p-5">
            <p className="section-label mb-1">Evolución temporal</p>
            <h2 className="font-semibold mb-5" style={{fontFamily:"var(--font-cormorant)",fontSize:"1.1rem",color:"var(--text)"}}>
              Conversaciones y pacientes nuevos
            </h2>
            <div style={{height:200}}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dayData} margin={{top:5,right:5,bottom:0,left:-20}}>
                  <defs>
                    <linearGradient id="cG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.2}/>
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="pG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.15}/>
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="fecha" tick={{fontSize:10,fill:"rgba(255,255,255,0.25)"}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:"rgba(255,255,255,0.25)"}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<Tip/>}/>
                  <Area type="monotone" dataKey="conversaciones" name="Conversaciones" stroke="#06B6D4" strokeWidth={2} fill="url(#cG)"/>
                  <Area type="monotone" dataKey="pacientes" name="Pacientes nuevos" stroke="#10B981" strokeWidth={1.5} fill="url(#pG)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Servicios */}
          {servicios.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="dm-card p-5">
                <p className="section-label mb-1">Distribución</p>
                <h2 className="font-semibold mb-5" style={{fontFamily:"var(--font-cormorant)",fontSize:"1.1rem",color:"var(--text)"}}>
                  Interés por tratamiento
                </h2>
                <div style={{height:160}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={servicios.map(s=>({...s,name:SRV[s.nombre]??s.nombre}))} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="count" paddingAngle={3}>
                        {servicios.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {servicios.map((s,i)=>(
                    <div key={s.nombre} className="flex items-center gap-1.5 text-sm" style={{color:"var(--text-2)"}}>
                      <div className="w-2.5 h-2.5 rounded-full" style={{background:COLORS[i%COLORS.length]}}/>
                      {SRV[s.nombre]??s.nombre} ({s.pct}%)
                    </div>
                  ))}
                </div>
              </div>

              <div className="dm-card p-5">
                <p className="section-label mb-1">Por tratamiento</p>
                <h2 className="font-semibold mb-5" style={{fontFamily:"var(--font-cormorant)",fontSize:"1.1rem",color:"var(--text)"}}>
                  Consultas recibidas
                </h2>
                <div style={{height:160}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={servicios.map(s=>({...s,nombre:SRV[s.nombre]??s.nombre}))} margin={{top:5,right:5,bottom:0,left:-20}}>
                      <XAxis dataKey="nombre" tick={{fontSize:9,fill:"rgba(255,255,255,0.3)"}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:"rgba(255,255,255,0.25)"}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<Tip/>}/>
                      <Bar dataKey="count" name="Consultas" radius={[4,4,0,0]}>
                        {servicios.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} opacity={0.85}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-center flex items-center justify-center gap-1.5" style={{ color: "var(--text-3)", fontFamily: "var(--font-cormorant)", fontStyle: "italic" }}>
            <MessageSquare className="w-3.5 h-3.5 not-italic" style={{ color: "var(--text-3)" }} />
            {totales.conversaciones.toLocaleString("es-CO")} conversaciones procesadas en el periodo seleccionado
          </p>
        </>
      )}
    </div>
  );
}
