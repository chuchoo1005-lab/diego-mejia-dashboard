"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarDays, Users, Bell, BarChart3, Menu, X, Settings, Video, LogOut } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const nav = [
  { href: "/",               label: "Panel Principal",  icon: LayoutDashboard, desc: "Vista general" },
  { href: "/citas",          label: "Leads para llamar",icon: CalendarDays,    desc: "Listos para contactar" },
  { href: "/pacientes",      label: "Pacientes",        icon: Users,           desc: "Base de datos" },
  { href: "/notificaciones", label: "Alertas",          icon: Bell,            desc: "Actividad del sistema" },
  { href: "/metricas",       label: "Métricas",         icon: BarChart3,       desc: "Análisis y reportes" },
  { href: "/recursos",       label: "Recursos",         icon: Video,           desc: "Videos de la clínica" },
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
        style={{ background: "#0A0A0A", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <DiegoMejiaLogo compact />
        <button onClick={() => setOpen(!open)} className="p-1.5 rounded transition-colors" style={{ color: "rgba(255,255,255,0.6)" }}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-40 w-[240px] flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ background: "#0D0D0D", borderRight: "1px solid rgba(255,255,255,0.08)" }}>

        {/* Brand */}
        <div className="px-6 pt-7 pb-5">
          <DiegoMejiaLogo />
          <p className="mt-2 text-[9px] font-semibold tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.22)" }}>
            Creamos Estilos de Vida
          </p>
        </div>

        {/* Doctor badge */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-sm"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "rgba(255,255,255,0.1)", color: "#FFF" }}>DM</div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">Dr. Diego Mejía</p>
              <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>Director Científico</p>
            </div>
            <div className="w-1.5 h-1.5 bg-white rounded-full shrink-0 active-dot" />
          </div>
        </div>

        <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "0 20px 8px" }} />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="section-label px-3 pb-2 pt-1">Menú</p>
          {nav.map(({ href, label, icon: Icon, desc }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13px] font-medium transition-all duration-150"
                style={{
                  color: active ? "#FFF" : "rgba(255,255,255,0.45)",
                  background: active ? "rgba(255,255,255,0.07)" : "transparent",
                  borderLeft: `2px solid ${active ? "rgba(255,255,255,0.65)" : "transparent"}`,
                }}>
                <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0"
                  style={{ background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)" }}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{label}</span>
                  {active && <span className="text-[10px] font-normal block mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{desc}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-4">
          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "10px" }} />
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13px] font-medium transition-all"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)" }}>
              <Settings className="w-3.5 h-3.5" />
            </div>
            Configuración
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-[13px] font-medium transition-all mt-0.5"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)" }}>
              <LogOut className="w-3.5 h-3.5" />
            </div>
            Cerrar sesión
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-0.5" style={{ color: "rgba(255,255,255,0.15)" }}>Powered by</p>
          <p className="text-[11px] font-black tracking-widest" style={{ color: "rgba(255,255,255,0.22)" }}>FLOWLUTION</p>
        </div>
      </aside>
    </>
  );
}

function DiegoMejiaLogo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-black tracking-widest px-2 py-0.5 text-black leading-tight"
          style={{ background: "#FFF", fontFamily: "var(--font-cormorant)" }}>DIEGO</span>
        <span className="text-sm font-light tracking-widest border border-white/50 px-2 py-0.5 leading-tight"
          style={{ color: "#FFF", fontFamily: "var(--font-cormorant)" }}>MEJÍA</span>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-black font-black tracking-widest px-2.5 py-0.5 leading-tight"
          style={{ background: "#FFF", fontFamily: "var(--font-cormorant)", fontSize: "1.05rem" }}>DIEGO</span>
        <span className="font-light tracking-widest border px-2.5 py-0.5 leading-tight"
          style={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", fontFamily: "var(--font-cormorant)", fontSize: "1.05rem" }}>MEJÍA</span>
      </div>
      <p className="mt-1 text-[8px] font-semibold tracking-[0.3em] uppercase" style={{ color: "rgba(255,255,255,0.28)" }}>Dental Group</p>
    </div>
  );
}
