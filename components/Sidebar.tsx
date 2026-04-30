"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, Users, Bell, BarChart3, Menu, X,
  Stethoscope, Settings
} from "lucide-react";
import { useState } from "react";

const nav = [
  { href: "/",              label: "Panel Principal", icon: LayoutDashboard, description: "Vista general" },
  { href: "/citas",         label: "Agenda de Citas", icon: CalendarDays,    description: "Gestión de citas" },
  { href: "/pacientes",     label: "Pacientes",       icon: Users,           description: "Base de datos" },
  { href: "/notificaciones",label: "Alertas",         icon: Bell,            description: "Centro de alertas" },
  { href: "/metricas",      label: "Métricas",        icon: BarChart3,       description: "Análisis y reportes" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-[#080c14]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <ToothLogo size={22} />
          <span className="text-sm font-bold text-white tracking-tight">Diego Mejía</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition-all"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-40 w-[260px]
        flex flex-col transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}
        style={{
          background: "linear-gradient(180deg, #080c14 0%, #0a0e1a 100%)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-teal-500/[0.04] to-transparent pointer-events-none" />

        {/* Brand area */}
        <div className="relative px-5 pt-6 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500/25 to-cyan-500/15 flex items-center justify-center border border-teal-500/25 shadow-lg shadow-teal-500/10">
                <ToothLogo size={20} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#080c14] active-dot" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-white tracking-tight leading-tight">Diego Mejía</h1>
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mt-0.5"
                style={{ color: "rgba(45,212,191,0.7)" }}>
                Dental Group
              </p>
            </div>
          </div>
        </div>

        {/* Doctor profile */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
              borderColor: "rgba(255,255,255,0.06)",
            }}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-teal-500/25 flex-shrink-0">
              DM
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white/85 truncate leading-tight">Dr. Diego Mejía</p>
              <p className="text-[10px] text-white/35 flex items-center gap-1 mt-0.5">
                <Stethoscope className="w-2.5 h-2.5" /> Odontólogo General
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent mb-2" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          <p className="section-label px-3 pb-2 pt-1">Menú principal</p>
          {nav.map(({ href, label, icon: Icon, description }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`
                  group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200
                  ${active
                    ? "text-white"
                    : "text-white/40 hover:text-white/70"
                  }
                `}
                style={active ? {
                  background: "linear-gradient(135deg, rgba(20,184,166,0.14), rgba(6,182,212,0.06))",
                  boxShadow: "inset 0 0 0 1px rgba(45,212,191,0.15), 0 4px 16px rgba(20,184,166,0.08)",
                } : undefined}
              >
                {/* Active left bar */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-gradient-to-b from-teal-400 to-cyan-500 shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
                )}

                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                  active
                    ? "bg-teal-500/20 text-teal-300 shadow-sm shadow-teal-500/20"
                    : "bg-white/[0.04] text-white/35 group-hover:bg-white/[0.07] group-hover:text-white/55"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block leading-tight">{label}</span>
                  {active && (
                    <span className="text-[10px] font-normal mt-0.5 block" style={{ color: "rgba(45,212,191,0.45)" }}>
                      {description}
                    </span>
                  )}
                </div>
                {active && (
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400/70 flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Settings */}
        <div className="px-3 pb-3">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-3" />
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.03] group-hover:bg-white/[0.06]">
              <Settings className="w-4 h-4" />
            </div>
            Configuración
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.05]"
          style={{ background: "rgba(255,255,255,0.008)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] text-white/15 uppercase tracking-[0.2em] font-medium">Powered by</p>
              <p className="text-[11px] font-black text-white/25 tracking-widest mt-0.5">FLOWLUTION</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
              style={{
                background: "rgba(20,184,166,0.08)",
                borderColor: "rgba(20,184,166,0.18)",
                boxShadow: "0 0 12px rgba(20,184,166,0.08)",
              }}>
              <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-semibold" style={{ color: "rgba(45,212,191,0.8)" }}>Online</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function ToothLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="tooth-icon">
      <path
        d="M12 2C9.5 2 7.5 3 6.5 4.5C5.5 6 5 8 5 10C5 12 5.5 13.5 6 15C6.5 16.5 7 18 7.5 20C7.8 21 8.5 22 9.5 22C10.5 22 11 21 11.5 19.5C11.8 18.5 12 17 12 17C12 17 12.2 18.5 12.5 19.5C13 21 13.5 22 14.5 22C15.5 22 16.2 21 16.5 20C17 18 17.5 16.5 18 15C18.5 13.5 19 12 19 10C19 8 18.5 6 17.5 4.5C16.5 3 14.5 2 12 2Z"
        fill="url(#toothGrad)"
        stroke="rgba(45,212,191,0.25)"
        strokeWidth="0.5"
      />
      <defs>
        <linearGradient id="toothGrad" x1="5" y1="2" x2="19" y2="22">
          <stop stopColor="#2dd4bf" />
          <stop offset="0.5" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
