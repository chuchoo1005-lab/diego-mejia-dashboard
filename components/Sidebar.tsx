"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, Users, Bell, BarChart3, Menu, X
} from "lucide-react";
import { useState } from "react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/citas", label: "Citas", icon: CalendarDays },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/notificaciones", label: "Notificaciones", icon: Bell },
  { href: "/metricas", label: "Métricas", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-[#1a2740] shadow-md">
        <LogoMark />
        <button onClick={() => setOpen(!open)} className="text-white/70 hover:text-white p-1">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-40 w-64
        bg-gradient-to-b from-[#1a2740] to-[#1e2f4a]
        flex flex-col transition-transform duration-200 shadow-xl
        ${open ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}>
        {/* Brand logo area */}
        <div className="px-5 py-6 border-b border-white/10">
          <LogoFull />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? "bg-white text-[#1a2740] shadow-md shadow-black/20"
                    : "text-white/70 hover:bg-white/10 hover:text-white"}
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-xs text-white/30">Sistema desarrollado por</p>
          <p className="text-xs font-semibold text-white/50 tracking-wide">FLOWLUTION</p>
        </div>
      </aside>
    </>
  );
}

function LogoMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        <span className="bg-white text-[#1a2740] text-xs font-black px-2 py-1 tracking-tight">DIEGO</span>
        <span className="bg-transparent border border-white text-white text-xs font-black px-2 py-1 tracking-tight">MEJÍA</span>
      </div>
    </div>
  );
}

function LogoFull() {
  return (
    <div>
      <div className="flex items-center mb-1">
        <span className="bg-white text-[#1a2740] text-sm font-black px-2.5 py-1.5 tracking-tight leading-none">DIEGO</span>
        <span className="border border-white/60 text-white text-sm font-black px-2.5 py-1.5 tracking-tight leading-none">MEJÍA</span>
      </div>
      <p className="text-white/50 text-xs tracking-[0.2em] uppercase mt-2 pl-0.5">Dental Group</p>
    </div>
  );
}
