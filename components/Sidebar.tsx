"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarDays, Users, Bell, BarChart3, Menu, X, Settings, Video, LogOut } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const nav = [
  { href: "/",               label: "Panel Principal",   icon: LayoutDashboard, desc: "Vista general" },
  { href: "/citas",          label: "Leads para llamar", icon: CalendarDays,    desc: "Listos para contactar" },
  { href: "/pacientes",      label: "Pacientes",         icon: Users,           desc: "Base de datos" },
  { href: "/notificaciones", label: "Alertas",           icon: Bell,            desc: "Actividad del sistema" },
  { href: "/metricas",       label: "Métricas",          icon: BarChart3,       desc: "Análisis" },
  { href: "/recursos",       label: "Recursos",          icon: Video,           desc: "Videos de la clínica" },
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
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ background: "#111111", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Logo compact />
        <button onClick={() => setOpen(!open)} style={{ color: "rgba(255,255,255,0.6)" }}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setOpen(false)} />
      )}

      {/* Sidebar — stays dark for the logo */}
      <aside className={`fixed top-0 left-0 h-full z-40 w-[240px] flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ background: "#111111", borderRight: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Brand */}
        <div className="px-6 pt-7 pb-5">
          <Logo />
          <p className="mt-2 text-[9px] font-semibold tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
            Creamos Estilos de Vida
          </p>
        </div>

        {/* Doctor */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "rgba(255,255,255,0.12)", color: "#FFF" }}>DM</div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">Dr. Diego Mejía</p>
              <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.38)" }}>Director Científico</p>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 active-dot" />
          </div>
        </div>

        <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", margin: "0 16px 8px" }} />

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="section-label px-3 pb-2 pt-1" style={{ color: "rgba(255,255,255,0.28)" }}>Menú</p>
          {nav.map(({ href, label, icon: Icon, desc }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all"
                style={{
                  color: active ? "#FFF" : "rgba(255,255,255,0.48)",
                  background: active ? "rgba(255,255,255,0.1)" : "transparent",
                  borderLeft: `2px solid ${active ? "rgba(255,255,255,0.7)" : "transparent"}`,
                }}>
                <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)" }}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{label}</span>
                  {active && <span className="text-[10px] block mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{desc}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4">
          <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", marginBottom: "10px" }} />
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all"
            style={{ color: "rgba(255,255,255,0.38)" }}>
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
              <Settings className="w-3.5 h-3.5" />
            </div>
            Configuración
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all mt-0.5"
            style={{ color: "rgba(255,255,255,0.38)" }}>
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
              <LogOut className="w-3.5 h-3.5" />
            </div>
            Cerrar sesión
          </button>
        </div>

        <div className="px-5 py-3.5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-0.5" style={{ color: "rgba(255,255,255,0.18)" }}>Powered by</p>
          <p className="text-[11px] font-black tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>FLOWLUTION</p>
        </div>
      </aside>
    </>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  const s = compact ? "0.95rem" : "1.05rem";
  return (
    <div className={`flex items-baseline gap-${compact ? "1.5" : "2"}`}>
      <span style={{ background: "#FFF", color: "#111", fontFamily: "var(--font-cormorant)", fontSize: s, fontWeight: 900, letterSpacing: "0.12em", padding: compact ? "2px 8px" : "3px 10px", lineHeight: 1 }}>
        DIEGO
      </span>
      <span style={{ color: "#FFF", border: "1px solid rgba(255,255,255,0.5)", fontFamily: "var(--font-cormorant)", fontSize: s, fontWeight: 300, letterSpacing: "0.12em", padding: compact ? "2px 8px" : "3px 10px", lineHeight: 1 }}>
        MEJÍA
      </span>
    </div>
  );
}
