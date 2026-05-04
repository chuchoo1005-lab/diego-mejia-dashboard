"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Users, Bell, BarChart3, Menu, X, Settings } from "lucide-react";
import { useState } from "react";

const nav = [
  { href: "/",               label: "Panel Principal", icon: LayoutDashboard, description: "Vista general" },
  { href: "/citas",          label: "Agenda de Citas", icon: CalendarDays,    description: "Gestión de citas" },
  { href: "/pacientes",      label: "Pacientes",       icon: Users,           description: "Base de datos" },
  { href: "/notificaciones", label: "Alertas",         icon: Bell,            description: "Centro de alertas" },
  { href: "/metricas",       label: "Métricas",        icon: BarChart3,       description: "Análisis y reportes" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: "#0A0A0A", borderColor: "rgba(255,255,255,0.07)" }}>
        <DiegoMejiáLogo compact />
        <button onClick={() => setOpen(!open)} className="p-1.5 rounded transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.8)" }} onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 w-[240px] flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ background: "#0A0A0A", borderRight: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Brand */}
        <div className="px-6 pt-7 pb-6">
          <DiegoMejiáLogo />
          <p className="mt-2 text-[9px] font-medium tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
            Creamos Estilos de Vida
          </p>
        </div>

        {/* Doctor */}
        <div className="px-4 pb-5">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "rgba(255,255,255,0.08)", color: "#FFFFFF" }}>
              DM
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">Dr. Diego Mejía</p>
              <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>Director Científico</p>
            </div>
            <div className="w-1.5 h-1.5 bg-white rounded-full shrink-0 active-dot" />
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 mb-2" style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="section-label px-3 pb-2 pt-1">Menú principal</p>
          {nav.map(({ href, label, icon: Icon, description }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-medium transition-all duration-150"
                style={{
                  color: active ? "#FFFFFF" : "rgba(255,255,255,0.4)",
                  background: active ? "rgba(255,255,255,0.06)" : "transparent",
                  borderLeft: active ? "2px solid rgba(255,255,255,0.6)" : "2px solid transparent",
                }}
              >
                <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0"
                  style={{ background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)" }}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{label}</span>
                  {active && <span className="text-[10px] font-normal block mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{description}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Settings */}
        <div className="px-3 pb-3">
          <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", marginBottom: "0.75rem" }} />
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-medium transition-all"
            style={{ color: "rgba(255,255,255,0.3)" }}>
            <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)" }}>
              <Settings className="w-3.5 h-3.5" />
            </div>
            Configuración
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.008)" }}>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-0.5" style={{ color: "rgba(255,255,255,0.15)" }}>Powered by</p>
          <p className="text-[11px] font-black tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>FLOWLUTION</p>
        </div>
      </aside>
    </>
  );
}

// ─── Logo DIEGO MEJÍA ─────────────────────────────────────────────────────────
function DiegoMejiáLogo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-black tracking-widest px-2 py-0.5 text-black" style={{ background: "#FFFFFF", fontFamily: "var(--font-cormorant)" }}>DIEGO</span>
        <span className="text-sm font-light tracking-widest border border-white/60 px-2 py-0.5" style={{ color: "#FFFFFF", fontFamily: "var(--font-cormorant)" }}>MEJÍA</span>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span
          className="text-black font-black tracking-widest px-2.5 py-0.5 leading-tight"
          style={{ background: "#FFFFFF", fontFamily: "var(--font-cormorant)", fontSize: "1.1rem" }}
        >
          DIEGO
        </span>
        <span
          className="font-light tracking-widest border px-2.5 py-0.5 leading-tight"
          style={{ color: "#FFFFFF", borderColor: "rgba(255,255,255,0.5)", fontFamily: "var(--font-cormorant)", fontSize: "1.1rem" }}
        >
          MEJÍA
        </span>
      </div>
      <p className="mt-1 text-[8px] font-semibold tracking-[0.3em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
        Dental Group
      </p>
    </div>
  );
}
