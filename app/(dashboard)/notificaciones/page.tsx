"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

function playAlarmSound() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const play = (freq: number, start: number, dur: number, vol = 0.4) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur);
    };
    play(523, 0.00, 0.18);
    play(659, 0.20, 0.18);
    play(784, 0.40, 0.18);
    play(1047, 0.60, 0.35);
    setTimeout(() => ctx.close(), 2000);
  } catch { /* navegador bloqueó audio */ }
}

// Funciona aunque la pestaña esté en segundo plano
function dispararAlarma(nombre?: string) {
  playAlarmSound();
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    new Notification("🦷 Valoración solicitada", {
      body: nombre ? `${nombre} quiere agendar su valoración` : "Un paciente quiere agendar su valoración",
      icon: "/apple-icon.png",
      tag: "valoracion-dm",
      requireInteraction: true,
    });
  }
}
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, MessageSquare, RefreshCw, TrendingUp, ArrowRight, Clock, Phone, Calendar } from "lucide-react";

interface Conv { id: string; paciente_id: string; direccion: string; mensaje_encriptado: string; timestamp: string; }
interface Alerta { tipo: string; alias: string; nombre: string; tel: string; descripcion: string; score: number; timestamp: string; urgencia: number; servicio: string | null; horario: string | null; ciudad: string | null; }
interface Seguimiento { alias: string; nombre: string; tel: string; horas: number; score: number; servicio: string | null; }

function formatTel(t: string | null): string {
  if (!t) return "";
  const c = t.replace(/\D/g, "");
  if (c.length >= 10 && c.startsWith("57")) return `+57 ${c.slice(2,5)} ${c.slice(5,8)} ${c.slice(8)}`;
  return t;
}

export default function NotificacionesPage() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"seguimientos" | "alertas" | "actividad">("seguimientos");
  const [notifPermiso, setNotifPermiso] = useState<NotificationPermission>("default");

  // Solicitar permiso de notificaciones al abrir la página
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermiso(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then(p => setNotifPermiso(p));
      }
    }
  }, []);

  // Pacientes ya conocidos como entrega_premium al cargar — evita falsos disparos
  const yaAlarmados = useRef(new Set<string>());
  const seeded = useRef(false);

  const load = useCallback(async () => {
    const [{ data: convData }, { data: pacData }] = await Promise.all([
      supabase.from("conversaciones").select("id,paciente_id,direccion,mensaje_encriptado,timestamp").order("timestamp", { ascending: false }).limit(40),
      supabase.from("pacientes").select("id,alias,telefono_encriptado,perfil_paciente,updated_at").eq("estado", "activo").order("updated_at", { ascending: false }).limit(60),
    ]);
    setConvs((convData || []) as Conv[]);

    const now = Date.now();
    const newAlertas: Alerta[] = [];
    const newSeg: Seguimiento[] = [];

    ((pacData || []) as { id: string; alias: string; telefono_encriptado: string | null; perfil_paciente: Record<string, unknown>; updated_at: string }[]).forEach(p => {
      const perf = p.perfil_paciente || {};
      const score = parseInt(String(perf.score ?? "0")) || 0;
      const ec = (perf.estado_conv as string) || "nuevo";
      const tel = formatTel(p.telefono_encriptado);
      const nombreReal = (perf.nombre as string) || null;
      const nombre = nombreReal || p.alias;
      const ua = perf.ultima_actividad_at ? new Date(perf.ultima_actividad_at as string) : new Date(p.updated_at);
      const hrs = (now - ua.getTime()) / 3600000;
      const ti = perf.tipo_intencion as string;
      const servicio = perf.servicio_interes as string | null;
      const horario = (perf.horario_contacto as string) || null;
      const ciudad = (perf.ciudad as string) || null;

      const svcLabel = servicio === "ortodoncia" || servicio === "invisalign" ? "Ortodoncia / Invisalign"
        : servicio === "diseno" ? "Diseño de sonrisa"
        : servicio === "implantes" ? "Implantes"
        : servicio === "blanqueamiento" ? "Blanqueamiento"
        : servicio ? servicio.charAt(0).toUpperCase() + servicio.slice(1)
        : null;

      // Registrar pacientes ya conocidos al primer load para no re-alarmar
      if (!seeded.current && (ec === "entrega_premium" || perf.notificado_asesora === true)) {
        yaAlarmados.current.add(p.id);
      }

      if (ec === "entrega_premium") {
        const desc = [svcLabel, horario ? `Horario: ${horario}` : null, ciudad].filter(Boolean).join(" · ") || "Datos completos";
        newAlertas.push({ tipo: "lead_listo", alias: p.alias, nombre, tel, descripcion: desc, score, timestamp: ua.toISOString(), urgencia: 100, servicio: svcLabel, horario, ciudad });
      } else if (ti === "referido") {
        const desc = [svcLabel, ciudad].filter(Boolean).join(" · ") || "Referido nuevo";
        newAlertas.push({ tipo: "referido", alias: p.alias, nombre, tel, descripcion: desc, score, timestamp: ua.toISOString(), urgencia: 90, servicio: svcLabel, horario, ciudad });
      } else if (score >= 70) {
        const desc = [svcLabel, horario ? `Horario: ${horario}` : null].filter(Boolean).join(" · ") || `Score ${score}`;
        newAlertas.push({ tipo: "caliente", alias: p.alias, nombre, tel, descripcion: desc, score, timestamp: ua.toISOString(), urgencia: 80, servicio: svcLabel, horario, ciudad });
      }

      if (hrs > 2 && hrs < 120 && score >= 20 && ec !== "entrega_premium" && ec !== "nuevo") {
        newSeg.push({ alias: p.alias, nombre, tel, horas: Math.round(hrs), score, servicio });
      }
    });

    if (!seeded.current) seeded.current = true;
    setAlertas(newAlertas.sort((a, b) => b.urgencia - a.urgencia));
    setSeguimientos(newSeg.sort((a, b) => b.score - a.score));
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  // Realtime: dispara sonido solo para pacientes NUEVOS en entrega_premium
  useEffect(() => {
    const channel = supabase
      .channel("dm_valoracion_alarm")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pacientes" }, (payload) => {
        const rec = payload.new as { id: string; perfil_paciente?: { estado_conv?: string; notificado_asesora?: boolean } };
        const estado = rec.perfil_paciente?.estado_conv;
        const notificado = rec.perfil_paciente?.notificado_asesora;
        if ((estado === "entrega_premium" || notificado === true) && !yaAlarmados.current.has(rec.id)) {
          yaAlarmados.current.add(rec.id);
          const nombre = (rec.perfil_paciente as Record<string, unknown> | undefined)?.nombre as string | undefined;
          dispararAlarma(nombre);
          load();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const TIPO: Record<string, { label: string; color: string; border: string }> = {
    lead_listo: { label: "Listo para llamar", color: "var(--green)", border: "rgba(16,185,129,0.3)" },
    referido:   { label: "Referido nuevo",    color: "var(--cyan)",  border: "rgba(6,182,212,0.3)" },
    caliente:   { label: "Lead caliente",     color: "var(--red)",   border: "rgba(239,68,68,0.25)" },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Centro de atención</p>
          <h1 style={{ fontFamily:"var(--font-cormorant)", fontSize:"2rem", fontWeight:500, color:"var(--text)" }}>Actividad</h1>
          <p className="text-sm mt-1" style={{ color:"var(--text-3)" }}>Seguimientos · Alertas · Conversaciones · Actualización cada 30s</p>
        </div>
        <div className="flex items-center gap-2">
          {notifPermiso !== "granted" && (
            <button onClick={() => Notification.requestPermission().then(p => setNotifPermiso(p))}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
              style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", color:"var(--red)" }}>
              <Bell className="w-3.5 h-3.5" /> Activar alertas
            </button>
          )}
          {notifPermiso === "granted" && (
            <button onClick={() => dispararAlarma("Prueba")}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
              style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", color:"var(--green)" }}>
              <Bell className="w-3.5 h-3.5" /> Probar sonido
            </button>
          )}
          <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
            style={{ background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", color:"var(--text-2)" }}>
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:"Seguimientos pendientes", value:seguimientos.length, icon:Clock,         color:"var(--amber)" },
          { label:"Alertas activas",         value:alertas.length,     icon:Bell,          color:"var(--red)" },
          { label:"Conversaciones recientes",value:convs.length,       icon:MessageSquare, color:"var(--cyan)" },
        ].map(({ label, value, icon:Icon, color }) => (
          <div key={label} className="dm-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-xs mt-1" style={{ color:"var(--text-3)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)" }}>
        {[
          { key:"seguimientos", label:`Seguimientos (${seguimientos.length})` },
          { key:"alertas",      label:`Alertas (${alertas.length})` },
          { key:"actividad",    label:"Conversaciones" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className="px-4 py-2 text-xs font-medium rounded-lg transition-all"
            style={{ background:tab===key?"rgba(255,255,255,0.08)":"transparent", color:tab===key?"var(--text)":"var(--text-3)" }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor:"rgba(6,182,212,0.2)", borderTopColor:"var(--cyan)" }} /></div>
      ) : tab === "seguimientos" ? (
        <div className="space-y-3">
          {seguimientos.length === 0 ? (
            <div className="dm-card p-12 text-center">
              <Clock className="w-8 h-8 mx-auto mb-3" style={{ color:"var(--text-3)" }} />
              <p className="font-medium" style={{ color:"var(--text-2)" }}>Sin seguimientos pendientes</p>
              <p className="text-sm mt-1" style={{ color:"var(--text-3)" }}>Los pacientes aparecen aquí cuando llevan más de 2h sin responder</p>
            </div>
          ) : seguimientos.map((s, i) => {
            const urgencia = s.horas > 48 ? "alta" : s.horas > 24 ? "media" : "normal";
            const colorUrgencia = urgencia === "alta" ? "var(--red)" : urgencia === "media" ? "var(--amber)" : "var(--text-3)";
            return (
              <div key={i} className="dm-card p-5" style={{ borderLeft:`3px solid ${colorUrgencia}` }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                    style={{ background:"rgba(255,255,255,0.06)", color:"var(--text-2)" }}>
                    {s.nombre.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-sm" style={{ color:"var(--text)" }}>{s.nombre}</span>
                      <span className="badge" style={{ background:`${colorUrgencia}18`, color:colorUrgencia, border:`1px solid ${colorUrgencia}40`, fontSize:"10px", padding:"2px 8px", borderRadius:"20px" }}>
                        {urgencia === "alta" ? "🔴 Urgente" : urgencia === "media" ? "🟡 Media" : "⚪ Normal"}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color:"var(--text-3)" }}>
                      {s.tel && <>{s.tel} · </>}
                      {s.servicio && <>{s.servicio === "ortodoncia" ? "Ortodoncia" : s.servicio === "diseno" ? "Diseño de sonrisa" : "General"} · </>}
                      Score: <strong style={{ color:"var(--text)" }}>{s.score}</strong>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black" style={{ color:colorUrgencia }}>{s.horas}h</p>
                    <p className="text-[10px]" style={{ color:"var(--text-3)" }}>sin responder</p>
                    {s.tel && (
                      <a href={`tel:${s.tel.replace(/\s/g,"")}`} className="flex items-center gap-1 mt-2 text-xs font-bold px-2.5 py-1.5 rounded-lg"
                        style={{ background:"var(--green)", color:"#000" }}>
                        <Phone className="w-3 h-3" /> Llamar
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : tab === "alertas" ? (
        <div className="space-y-3">
          {alertas.length === 0 ? (
            <div className="dm-card p-12 text-center">
              <Bell className="w-8 h-8 mx-auto mb-3" style={{ color:"var(--text-3)" }} />
              <p className="font-medium" style={{ color:"var(--text-2)" }}>Todo al día — sin alertas</p>
            </div>
          ) : alertas.map((a, i) => {
            const cfg = TIPO[a.tipo] ?? { label:a.tipo, color:"var(--text-2)", border:"var(--border)" };
            return (
              <div key={i} className="dm-card p-4 flex items-center gap-4" style={{ borderLeft:`3px solid ${cfg.border}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
                  style={{ background:"rgba(255,255,255,0.05)", color:"var(--text-2)" }}>
                  {a.nombre.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-sm" style={{ color:"var(--text)" }}>{a.nombre}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background:`${cfg.color}18`, color:cfg.color, border:`1px solid ${cfg.border}` }}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color:"var(--text-2)" }}>{a.descripcion}</p>
                  {a.tel && <p className="text-[11px] mt-0.5 font-medium" style={{ color:"var(--text-3)" }}>{a.tel}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black" style={{ color:a.score>=60?"var(--cyan)":"var(--text-3)" }}>{a.score}</p>
                  {a.tel && (
                    <a href={`tel:${a.tel.replace(/\s/g,"")}`} className="flex items-center gap-1 mt-1 text-xs font-bold px-2.5 py-1.5 rounded-lg"
                      style={{ background:"var(--green)", color:"#000" }}>
                      <Phone className="w-3 h-3" /> Llamar
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="dm-card overflow-hidden">
          {convs.length === 0 ? (
            <div className="p-12 text-center"><MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color:"var(--text-3)" }} /><p style={{ color:"var(--text-2)" }}>Sin actividad reciente</p></div>
          ) : convs.map((c, i) => (
            <div key={c.id} className={`flex items-start gap-3 px-5 py-3.5 ${i>0?"border-t":""}`} style={{ borderColor:"rgba(255,255,255,0.05)" }}>
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${c.direccion==="entrante"?"bg-cyan-400":"bg-gray-600"}`}
                style={c.direccion==="entrante" ? { boxShadow:"0 0 6px rgba(6,182,212,0.6)" } : {}} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold" style={{ color:c.direccion==="entrante"?"var(--cyan)":"var(--text-3)" }}>
                    {c.direccion==="entrante"?"Paciente":"Asistente virtual"}
                  </span>
                  <span className="text-[10px] ml-auto" style={{ color:"var(--text-3)" }}>
                    {formatDistanceToNow(new Date(c.timestamp), { locale:es, addSuffix:true })}
                  </span>
                </div>
                <p className="text-sm truncate" style={{ color:"var(--text)" }}>{c.mensaje_encriptado||"—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
