"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarDays, Users, Bell, BarChart3, Menu, X, Settings, Video, LogOut, Cpu, MessageCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const nav = [
  { href: "/",               label: "Panel IA",          icon: Cpu,             desc: "Centro de admisiones" },
  { href: "/citas",          label: "Leads prioritarios",icon: CalendarDays,    desc: "Listos para contactar" },
  { href: "/pacientes",      label: "Pacientes",         icon: Users,           desc: "Base de datos" },
  { href: "/notificaciones", label: "Actividad",         icon: Bell,            desc: "Feed en tiempo real" },
  { href: "/metricas",       label: "Métricas",          icon: BarChart3,       desc: "Análisis" },
  { href: "/recursos",       label: "Recursos",          icon: Video,           desc: "Videos clínica" },
  { href: "/whatsapp",      label: "WhatsApp",          icon: MessageCircle,   desc: "Conexión y QR" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ background: "rgba(7,11,18,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(6,182,212,0.1)" }}>
        <Logo compact />
        <button onClick={() => setOpen(!open)} style={{ color: "rgba(255,255,255,0.5)" }}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && <div className="lg:hidden fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setOpen(false)} />}

      <aside className={`fixed top-0 left-0 h-full z-40 w-[240px] flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ background: "var(--sidebar)", borderRight: "1px solid rgba(6,182,212,0.08)" }}>

        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.4), transparent)" }} />

        {/* Brand */}
        <div className="px-6 pt-7 pb-5">
          <Logo />
          <p className="mt-2 text-[9px] font-semibold tracking-[0.22em] uppercase" style={{ color: "rgba(6,182,212,0.45)" }}>
            Creamos Estilos de Vida
          </p>
        </div>

        {/* Status */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.12)" }}>
            <div className="relative shrink-0">
              <div className="glow-dot pulse-ring" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold" style={{ color: "var(--cyan)" }}>IA Activa</p>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Dr. Diego Mejía</p>
            </div>
          </div>
        </div>

        <div className="mx-5 mb-2" style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)" }} />

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="section-label px-3 pb-2 pt-1">Navegación</p>
          {nav.map(({ href, label, icon: Icon, desc }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150"
                style={{
                  color: active ? "var(--cyan)" : "rgba(255,255,255,0.42)",
                  background: active ? "rgba(6,182,212,0.08)" : "transparent",
                  borderLeft: `2px solid ${active ? "var(--cyan)" : "transparent"}`,
                  boxShadow: active ? "inset 0 0 20px rgba(6,182,212,0.04)" : "none",
                }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: active ? "rgba(6,182,212,0.12)" : "rgba(255,255,255,0.04)" }}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{label}</span>
                  {active && <span className="text-[10px] block mt-0.5" style={{ color: "rgba(6,182,212,0.5)" }}>{desc}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4">
          <div className="mx-2 mb-2" style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px]" style={{ color: "rgba(255,255,255,0.28)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)" }}><Settings className="w-3.5 h-3.5" /></div>
            Configuración
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)" }}><LogOut className="w-3.5 h-3.5" /></div>
            Cerrar sesión
          </button>
        </div>

        <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-0.5" style={{ color: "rgba(255,255,255,0.15)" }}>Powered by</p>
          <p className="text-[11px] font-black tracking-widest" style={{ color: "rgba(255,255,255,0.22)" }}>FLOWLUTION</p>
        </div>
      </aside>
    </>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  const s = compact ? "0.9rem" : "1rem";
  return (
    <div className={`flex items-baseline gap-${compact ? "1.5" : "2"}`}>
      <span style={{ background: "#FFF", color: "#080C14", fontFamily: "var(--font-cormorant)", fontSize: s, fontWeight: 900, letterSpacing: "0.12em", padding: compact ? "2px 7px" : "3px 9px", lineHeight: 1 }}>DIEGO</span>
      <span style={{ color: "#FFF", border: "1px solid rgba(255,255,255,0.4)", fontFamily: "var(--font-cormorant)", fontSize: s, fontWeight: 300, letterSpacing: "0.12em", padding: compact ? "2px 7px" : "3px 9px", lineHeight: 1 }}>MEJÍA</span>
    </div>
  );
}
