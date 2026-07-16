"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, MessageSquare, RefreshCw, Clock, Phone } from "lucide-react";
import {
  Paciente, CardListo, CardOtro, CardHandlers,
  ec, sc, ua, resultadoLlamada, RESULTADOS_TERMINALES,
} from "@/components/CallCard";

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
    play(523, 0.00, 0.18); play(659, 0.20, 0.18); play(784, 0.40, 0.18); play(1047, 0.60, 0.35);
    setTimeout(() => ctx.close(), 2000);
  } catch { /* navegador bloqueó audio */ }
}

function dispararAlarma(nombre?: string) {
  playAlarmSound();
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    new Notification("🦷 Valoración solicitada", {
      body: nombre ? `${nombre} quiere agendar su valoración` : "Un paciente quiere agendar su valoración",
      icon: "/apple-icon.png", tag: "valoracion-dm", requireInteraction: true,
    });
  }
}

interface Conv { id: string; paciente_id: string; direccion: string; mensaje_encriptado: string; timestamp: string; }

export default function NotificacionesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"alertas" | "seguimientos" | "actividad">("alertas");
  const [notifPermiso, setNotifPermiso] = useState<NotificationPermission>("default");

  // Call flow state
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [notasTemp, setNotasTemp] = useState<Record<string, string>>({});

  const yaAlarmados = useRef(new Set<string>());
  const seeded = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermiso(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then(p => setNotifPermiso(p));
      }
    }
  }, []);

  const load = useCallback(async () => {
    const [{ data: convData }, { data: pacData }] = await Promise.all([
      supabase.from("conversaciones").select("id,paciente_id,direccion,mensaje_encriptado,timestamp").order("timestamp", { ascending: false }).limit(40),
      supabase.from("pacientes").select("id,alias,calificado,telefono_encriptado,perfil_paciente,updated_at,modo_humano").eq("estado", "activo").order("updated_at", { ascending: false }).limit(100),
    ]);
    setConvs((convData || []) as Conv[]);
    const pacs = (pacData || []) as Paciente[];

    // Seed yaAlarmados on first load to avoid re-alarming existing leads
    if (!seeded.current) {
      pacs.forEach(p => {
        if (ec(p) === "entrega_premium" || p.perfil_paciente?.notificado_asesora === true) {
          yaAlarmados.current.add(p.id);
        }
      });
      seeded.current = true;
    }

    setPacientes(pacs);
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel("dm_valoracion_alarm")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pacientes" }, (payload) => {
        const rec = payload.new as { id: string; perfil_paciente?: { estado_conv?: string; notificado_asesora?: boolean; nombre?: string } };
        const estado = rec.perfil_paciente?.estado_conv;
        const notificado = rec.perfil_paciente?.notificado_asesora;
        if ((estado === "entrega_premium" || notificado === true) && !yaAlarmados.current.has(rec.id)) {
          yaAlarmados.current.add(rec.id);
          dispararAlarma(rec.perfil_paciente?.nombre);
        }
        // Sincronización en tiempo real: cualquier cambio (ej. mover lead desde otro dispositivo) refresca aquí
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(load, 800);
      })
      .subscribe();
    return () => { if (timeout) clearTimeout(timeout); supabase.removeChannel(channel); };
  }, [load]);

  // Call flow handlers
  const updatePerfil = async (id: string, updates: Record<string, unknown>) => {
    setSaving(id);
    const pac = pacientes.find(p => p.id === id);
    if (!pac) return;
    const newPerfil = { ...(pac.perfil_paciente || {}), ...updates };
    await supabase.from("pacientes").update({ perfil_paciente: newPerfil }).eq("id", id);
    setPacientes(prev => prev.map(p => p.id === id ? { ...p, perfil_paciente: newPerfil } : p));
    setSaving(null);
  };

  const setResultado = (p: Paciente, valor: string) => updatePerfil(p.id, { resultado_llamada: valor, resultado_at: new Date().toISOString() });
  const guardarNotas = (p: Paciente) => { const nota = notasTemp[p.id] ?? (p.perfil_paciente?.notas_internas as string ?? ""); updatePerfil(p.id, { notas_internas: nota }); };
  const toggleCandado = async (p: Paciente) => {
    const nuevo = !p.modo_humano;
    setSaving(p.id);
    await supabase.from("pacientes").update({ modo_humano: nuevo, modo_humano_at: nuevo ? new Date().toISOString() : null }).eq("id", p.id);
    setPacientes(prev => prev.map(x => x.id === p.id ? { ...x, modo_humano: nuevo } : x));
    setSaving(null);
  };
  const toggleExp = (id: string) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const handlers: CardHandlers = { expanded, toggleExp, notasTemp, setNotasTemp, saving, setResultado, guardarNotas, toggleCandado };

  // Derive lists — exclude leads with terminal call results
  const now = Date.now();
  const esTerminal = (p: Paciente) => RESULTADOS_TERMINALES.includes(resultadoLlamada(p));

  // Sin resultado = aún no atendido. Cualquier resultado = ya fue al pipeline, no mostrar aquí.
  const sinResultado = (p: Paciente) => !resultadoLlamada(p);
  const alertasListos   = pacientes.filter(p => ec(p) === "entrega_premium" && sinResultado(p)).slice(0, 3);
  const alertasCaliente = pacientes.filter(p => ec(p) !== "entrega_premium" && sc(p) >= 70 && sinResultado(p)).slice(0, 2);
  const alertasReferido = pacientes.filter(p => (p.perfil_paciente?.tipo_intencion as string) === "referido" && ec(p) !== "entrega_premium" && sinResultado(p)).slice(0, 2);
  const totalAlertas = alertasListos.length + alertasCaliente.length + alertasReferido.length;

  const seguimientosPacs = pacientes.filter(p => {
    const hrs = (now - ua(p).getTime()) / 3600000;
    return hrs > 2 && hrs < 120 && sc(p) >= 20 && ec(p) !== "entrega_premium" && ec(p) !== "nuevo" && !esTerminal(p);
  }).sort((a, b) => sc(b) - sc(a));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="section-label mb-2">Centro de atención</p>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)" }}>Actividad</h1>
          <p className="text-sm mt-1 uppercase tracking-wide" style={{ color: "var(--text-3)" }}>Alertas · Seguimientos · Conversaciones · Actualización cada 30s</p>
        </div>
        <div className="flex items-center gap-2">
          {notifPermiso !== "granted" && (
            <button onClick={() => Notification.requestPermission().then(p => setNotifPermiso(p))}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--red)" }}>
              <Bell className="w-3.5 h-3.5" /> Activar alertas
            </button>
          )}
          {notifPermiso === "granted" && (
            <button onClick={() => dispararAlarma("Prueba")}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "var(--green)" }}>
              <Bell className="w-3.5 h-3.5" /> Probar sonido
            </button>
          )}
          <button onClick={load} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Alertas activas",           value: totalAlertas,          icon: Bell,          color: "var(--red)" },
          { label: "Seguimientos pendientes",    value: seguimientosPacs.length, icon: Clock,       color: "var(--amber)" },
          { label: "Conversaciones recientes",   value: convs.length,          icon: MessageSquare, color: "var(--cyan)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="dm-card p-4">
            <div className="flex items-center gap-2 mb-2"><Icon className="w-4 h-4" style={{ color }} /></div>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-sm mt-1 uppercase" style={{ color: "var(--text-3)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
        {[
          { key: "alertas",      label: `Alertas (${totalAlertas})` },
          { key: "seguimientos", label: `Seguimientos (${seguimientosPacs.length})` },
          { key: "actividad",    label: "Conversaciones" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className="px-4 py-2 text-[13px] font-medium rounded-lg transition-all uppercase"
            style={{ background: tab === key ? "rgba(255,255,255,0.08)" : "transparent", color: tab === key ? "var(--text)" : "var(--text-3)" }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(6,182,212,0.2)", borderTopColor: "var(--cyan)" }} /></div>
      ) : tab === "alertas" ? (
        <div className="space-y-8">

          {/* Listos para llamar */}
          {alertasListos.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: "#10B981", boxShadow: "0 0 6px #10B981" }} />
                <h2 className="text-sm font-bold" style={{ color: "#10B981" }}>LISTOS PARA LLAMAR</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>{alertasListos.length}</span>
              </div>
              <div className="space-y-3">
                {alertasListos.map(p => <CardListo key={p.id} p={p} h={handlers} />)}
              </div>
            </section>
          )}

          {/* Leads calientes */}
          {alertasCaliente.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: "var(--red)" }} />
                <h2 className="text-sm font-bold" style={{ color: "var(--red)" }}>LEADS CALIENTES</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}>{alertasCaliente.length}</span>
              </div>
              <div className="space-y-2">
                {alertasCaliente.map(p => <CardOtro key={p.id} p={p} accent h={handlers} />)}
              </div>
            </section>
          )}

          {/* Referidos */}
          {alertasReferido.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: "var(--cyan)" }} />
                <h2 className="text-sm font-bold" style={{ color: "var(--cyan)" }}>REFERIDOS</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(6,182,212,0.1)", color: "var(--cyan)" }}>{alertasReferido.length}</span>
              </div>
              <div className="space-y-2">
                {alertasReferido.map(p => <CardOtro key={p.id} p={p} h={handlers} />)}
              </div>
            </section>
          )}

          {totalAlertas === 0 && (
            <div className="dm-card p-12 text-center">
              <Bell className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-3)" }} />
              <p className="text-base font-medium" style={{ color: "var(--text-2)" }}>Todo al día — sin alertas</p>
            </div>
          )}
        </div>

      ) : tab === "seguimientos" ? (
        <div className="space-y-2">
          {seguimientosPacs.length === 0 ? (
            <div className="dm-card p-12 text-center">
              <Clock className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-3)" }} />
              <p className="text-base font-medium" style={{ color: "var(--text-2)" }}>Sin seguimientos pendientes</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>Los pacientes aparecen aquí cuando llevan más de 2h sin responder</p>
            </div>
          ) : seguimientosPacs.map(p => {
            const hrs = Math.round((now - ua(p).getTime()) / 3600000);
            const urgencia = hrs > 48 ? "alta" : hrs > 24 ? "media" : "normal";
            const colorUrgencia = urgencia === "alta" ? "var(--red)" : urgencia === "media" ? "var(--amber)" : "var(--text-3)";
            return (
              <div key={p.id} style={{ borderLeft: `3px solid ${colorUrgencia}` }}>
                <CardOtro p={p} h={handlers} />
                <div className="px-3 pb-2 -mt-1">
                  <span className="text-[13px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: `${colorUrgencia}18`, color: colorUrgencia, border: `1px solid ${colorUrgencia}40` }}>
                    {urgencia === "alta" ? "🔴 Urgente" : urgencia === "media" ? "🟡 Media" : "⚪ Normal"} · {hrs}h sin responder
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      ) : (
        <div className="dm-card overflow-hidden">
          {convs.length === 0 ? (
            <div className="p-12 text-center"><MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-3)" }} /><p className="text-base" style={{ color: "var(--text-2)" }}>Sin actividad reciente</p></div>
          ) : convs.map((c, i) => (
            <div key={c.id} className={`flex items-start gap-3 px-5 py-3.5 ${i > 0 ? "border-t" : ""}`} style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${c.direccion === "entrante" ? "bg-cyan-400" : "bg-gray-600"}`}
                style={c.direccion === "entrante" ? { boxShadow: "0 0 6px rgba(6,182,212,0.6)" } : {}} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: c.direccion === "entrante" ? "var(--cyan)" : "var(--text-3)" }}>
                    {c.direccion === "entrante" ? "Paciente" : "Asistente virtual"}
                  </span>
                  <span className="text-[13px] ml-auto" style={{ color: "var(--text-3)" }}>
                    {formatDistanceToNow(new Date(c.timestamp), { locale: es, addSuffix: true })}
                  </span>
                </div>
                <p className="text-[15px] truncate" style={{ color: "var(--text)" }}>{c.mensaje_encriptado || "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
