"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, TrendingUp, MessageSquare, Users, Target, Clock, Phone } from "lucide-react";

interface DayData { fecha: string; conversaciones: number; pacientes: number; }

const SRV: Record<string, string> = { ortodoncia: "Ortodoncia invisible", invisalign: "Ortodoncia invisible", brackets: "Ortodoncia brackets", diseno: "Diseño de sonrisa", general: "Odontología general" };
const COLORS = ["#06B6D4","#10B981","#F59E0B","#EF4444","#A78BFA"];

const Tip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-3 rounded-xl text-xs shadow-lg" style={{ background:"rgba(10,10,18,0.95)", border:"1px solid rgba(255,255,255,0.1)" }}>
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

export default function MetricasPage() {
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [totales, setTotales] = useState({ pacientes:0, conversaciones:0, calificados:0, scoreAvg:0, listos:0, tasaConversion:0 });
  const [servicios, setServicios] = useState<{ nombre:string; count:number; pct:number }[]>([]);
  const [funnel, setFunnel] = useState<{ label:string; value:number; pct:number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const dias = 14;
    const desde = subDays(new Date(), dias-1); desde.setHours(0,0,0,0);
    const [{ data:pacs }, { data:convs }, { count:totalPacs }, { count:calificados }, { count:listos }] = await Promise.all([
      supabase.from("pacientes").select("created_at,perfil_paciente").gte("created_at", desde.toISOString()),
      supabase.from("conversaciones").select("timestamp").gte("timestamp", desde.toISOString()),
      supabase.from("pacientes").select("*",{count:"exact",head:true}),
      supabase.from("pacientes").select("*",{count:"exact",head:true}).eq("calificado",true),
      supabase.from("pacientes").select("*",{count:"exact",head:true}).contains("perfil_paciente",{"estado_conv":"entrega_premium"}),
    ]);
    const days: Record<string,DayData> = {};
    for (let i=0;i<dias;i++) {
      const d = format(subDays(new Date(),dias-1-i),"yyyy-MM-dd");
      days[d] = { fecha:format(subDays(new Date(),dias-1-i),"d MMM",{locale:es}), conversaciones:0, pacientes:0 };
    }
    (pacs||[]).forEach(p=>{const d=format(new Date(p.created_at),"yyyy-MM-dd");if(days[d])days[d].pacientes++;});
    (convs||[]).forEach(c=>{const d=format(new Date(c.timestamp),"yyyy-MM-dd");if(days[d])days[d].conversaciones++;});
    setDayData(Object.values(days));
    const {data:allPacs} = await supabase.from("pacientes").select("perfil_paciente").eq("estado","activo").limit(500);
    let sum=0,cnt=0; const srvCnt:Record<string,number>={};
    (allPacs||[]).forEach(p=>{
      const s=parseInt(String(p.perfil_paciente?.score??"0"))||0;
      if(s>0){sum+=s;cnt++;}
      const srv=p.perfil_paciente?.servicio_interes as string;
      if(srv)srvCnt[srv]=(srvCnt[srv]||0)+1;
    });
    const total=(totalPacs||0);
    const cal=(calificados||0);
    const list=(listos||0);
    const tasa=total>0?Math.round((list/total)*100):0;
    setTotales({pacientes:total,conversaciones:(convs||[]).length,calificados:cal,scoreAvg:cnt>0?Math.round(sum/cnt):0,listos:list,tasaConversion:tasa});
    const srvTotal=Object.values(srvCnt).reduce((a,b)=>a+b,0);
    setServicios(Object.entries(srvCnt).map(([n,c])=>({nombre:n,count:c,pct:srvTotal>0?Math.round((c/srvTotal)*100):0})).sort((a,b)=>b.count-a.count));
    setFunnel([
      {label:"Total leads", value:total, pct:100},
      {label:"Con conversación", value:Math.max(cal,(allPacs||[]).filter(p=>(p.perfil_paciente?.estado_conv||"nuevo")!=="nuevo").length), pct:total>0?Math.round(((allPacs||[]).filter(p=>(p.perfil_paciente?.estado_conv||"nuevo")!=="nuevo").length/total)*100):0},
      {label:"Calificados", value:cal, pct:total>0?Math.round((cal/total)*100):0},
      {label:"Listos para llamar", value:list, pct:total>0?Math.round((list/total)*100):0},
    ]);
    setLoading(false);
  }, []);

  useEffect(()=>{load();},[load]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Análisis y reportes</p>
          <h1 style={{fontFamily:"var(--font-cormorant)",fontSize:"2rem",fontWeight:500,color:"var(--text)"}}>Métricas</h1>
          <p className="text-sm mt-1" style={{color:"var(--text-3)"}}>Últimos 14 días · Tiempo real</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
          style={{background:"rgba(255,255,255,0.05)",border:"1px solid var(--border)",color:"var(--text-2)"}}>
          <RefreshCw className="w-3.5 h-3.5"/> Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          {label:"Total pacientes", value:totales.pacientes, icon:Users, color:"var(--cyan)"},
          {label:"Chats (14d)", value:totales.conversaciones, icon:MessageSquare, color:"#A78BFA"},
          {label:"Calificados", value:totales.calificados, icon:Target, color:"var(--amber)"},
          {label:"Listos llamar", value:totales.listos, icon:Phone, color:"var(--green)"},
          {label:"Score prom.", value:totales.scoreAvg, icon:TrendingUp, color:"var(--cyan)"},
          {label:"Conversión", value:`${totales.tasaConversion}%`, icon:Clock, color:"var(--green)", highlight:true},
        ].map(({label,value,icon:Icon,color,highlight})=>(
          <div key={label} className="dm-card p-4" style={highlight?{borderColor:"rgba(16,185,129,0.3)"}:{}}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{background:`${color}18`}}>
              <Icon className="w-3.5 h-3.5" style={{color}}/>
            </div>
            <p className="text-xl font-black" style={{color}}>{value}</p>
            <p className="text-[11px] mt-0.5" style={{color:"var(--text-3)"}}>{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{borderColor:"rgba(6,182,212,0.2)",borderTopColor:"var(--cyan)"}}/></div>
      ) : (
        <>
          {/* Embudo de conversión */}
          <div className="dm-card p-5">
            <p className="section-label mb-1">Embudo completo</p>
            <h2 className="font-semibold mb-5" style={{fontFamily:"var(--font-cormorant)",fontSize:"1.1rem",color:"var(--text)"}}>
              Pipeline de admisión
            </h2>
            <div className="space-y-3">
              {funnel.map(({label,value,pct},i)=>{
                const colors=["rgba(255,255,255,0.15)","#A78BFA","var(--cyan)","var(--green)"];
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black w-5" style={{color:"var(--text-3)"}}>0{i+1}</span>
                        <span className="text-sm font-medium" style={{color:"var(--text)"}}>{label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold" style={{color:"var(--text)"}}>{value}</span>
                        <span className="text-[11px] w-10 text-right" style={{color:"var(--text-3)"}}>{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full" style={{background:"rgba(255,255,255,0.05)"}}>
                      <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:colors[i],boxShadow:i>1?`0 0 8px ${colors[i]}50`:"none"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
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
                    <div key={s.nombre} className="flex items-center gap-1.5 text-xs" style={{color:"var(--text-2)"}}>
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
        </>
      )}
    </div>
  );
}
