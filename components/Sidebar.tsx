"use client";
interface BeforeInstallPromptEvent extends Event {
  prompt?: () => void;
  userChoice?: Promise<{ outcome: string }>;
}
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarDays, Users, Bell, BarChart3, Menu, X, LogOut, Calendar, TrendingUp, Download, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const nav = [
  { href: "/",               label: "Panel Principal",     icon: LayoutDashboard, desc: "Centro de admisiones" },
  { href: "/citas",          label: "Leads para llamar",   icon: CalendarDays,    desc: "Listos para contactar" },
  { href: "/agenda",         label: "Agenda",              icon: Calendar,        desc: "Calendario de citas" },
  { href: "/pacientes",      label: "Pacientes",           icon: Users,           desc: "Base de datos" },
  { href: "/seguimientos",   label: "Seguimientos",        icon: Activity,        desc: "Pipeline de conversión" },
  { href: "/notificaciones", label: "Actividad",           icon: Bell,            desc: "Feed en tiempo real" },
  { href: "/metricas",       label: "Métricas",            icon: BarChart3,       desc: "Análisis" },
  { href: "/roi",            label: "Retorno de Inversión",icon: TrendingUp,      desc: "Rendimiento del sistema" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);

  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const ios = (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))) && !(window as { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    const prompt = installPrompt as BeforeInstallPromptEvent;
    prompt.prompt?.();
    const result = await prompt.userChoice;
    if (result?.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ background: "rgba(7,11,18,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(6,182,212,0.1)" }}>
        <Logo compact />
        <button onClick={() => setOpen(!open)} style={{ color: "rgba(255,255,255,0.5)" }}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && <div className="lg:hidden fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setOpen(false)} />}

      <aside className={`fixed top-0 left-0 h-full z-40 w-[248px] flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ background: "var(--sidebar)", borderRight: "1px solid rgba(76,141,255,0.1)" }}>

        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(76,141,255,0.5), rgba(47,224,232,0.5), transparent)" }} />

        {/* Brand */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mx-6 mt-6 mb-1 relative flex justify-center">
          <div className="absolute -inset-5 rounded-full logo-halo" />
          <div className="relative rounded-xl" style={{ padding: 1.5, background: "linear-gradient(135deg, var(--blue), var(--cyan), var(--violet), var(--blue))", backgroundSize: "300% 300%", animation: "logoBorder 6s linear infinite" }}>
            <div className="rounded-[10px] overflow-hidden relative p-3.5" style={{ background: "var(--sidebar)" }}>
              <Logo />
              <motion.div className="absolute inset-y-0 pointer-events-none" style={{ width: "45%", background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.4), transparent)" }}
                initial={{ left: "-60%" }} animate={{ left: "130%" }} transition={{ duration: 1.3, delay: 0.6, ease: "easeInOut" }} />
            </div>
          </div>
        </motion.div>
        <div className="px-6 pt-3 pb-2">
          <p className="text-[12px] font-semibold tracking-[0.14em] uppercase" style={{ background: "linear-gradient(90deg, var(--cyan), var(--blue))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Creamos Estilos de Vida
          </p>
        </div>

        {/* Doctor */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(76,141,255,0.06)", border: "1px solid rgba(76,141,255,0.16)" }}>
            <div className="relative shrink-0">
              <div className="glow-dot pulse-ring" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold" style={{ color: "var(--cyan)" }}>Sistema activo</p>
              <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>Dr. Diego Mejía</p>
            </div>
          </div>
        </div>

        <div className="mx-5 mb-2" style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)" }} />

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="section-label px-3 pb-2 pt-1">Navegación</p>
          {nav.map(({ href, label, icon: Icon, desc }, i) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <motion.div key={href} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.04 * i }}>
                <Link href={href} prefetch={false} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-semibold uppercase tracking-wide transition-all duration-150 relative"
                  style={{
                    color: active ? "#EAF2FF" : "rgba(255,255,255,0.75)",
                    background: active ? "linear-gradient(90deg, rgba(76,141,255,0.16), rgba(47,224,232,0.04))" : "transparent",
                  }}>
                  {active && (
                    <motion.span layoutId="nav-active-bar" className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-full"
                      style={{ background: "linear-gradient(180deg, var(--cyan), var(--blue))", boxShadow: "0 0 10px rgba(76,141,255,0.6)" }} />
                  )}
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: active ? "rgba(76,141,255,0.2)" : "rgba(255,255,255,0.04)", color: active ? "var(--cyan)" : "inherit" }}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{label}</span>
                    {active && <span className="text-[12px] normal-case font-normal block mt-0.5" style={{ color: "rgba(47,224,232,0.75)" }}>{desc}</span>}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4">
          <div className="mx-2 mb-2" style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />

          {!isStandalone && !installed && (
            isIOS ? (
              <div className="mb-1 px-3 py-2.5 rounded-xl" style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Download className="w-3.5 h-3.5" style={{ color: "var(--cyan)" }} />
                  <span className="text-[13px] font-semibold" style={{ color: "var(--cyan)" }}>Instalar como app</span>
                </div>
                <p className="text-[13px] leading-snug" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Toca <span style={{ color: "var(--cyan)" }}>⎙ Compartir</span> en Safari y luego <span style={{ color: "var(--cyan)" }}>"Añadir a inicio"</span>
                </p>
              </div>
            ) : installPrompt ? (
              <button onClick={handleInstall}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-semibold mb-1 transition-all"
                style={{ background: "rgba(6,182,212,0.1)", color: "var(--cyan)", border: "1px solid rgba(6,182,212,0.2)" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(6,182,212,0.15)" }}>
                  <Download className="w-3.5 h-3.5" />
                </div>
                Instalar como app
              </button>
            ) : (
              <div className="mb-1 px-3 py-2.5 rounded-xl" style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.12)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Download className="w-3.5 h-3.5" style={{ color: "var(--cyan)" }} />
                  <span className="text-[13px] font-semibold" style={{ color: "var(--cyan)" }}>Instalar como app</span>
                </div>
                <p className="text-[13px] leading-snug" style={{ color: "rgba(255,255,255,0.65)" }}>
                  En Chrome: menú <span style={{ color: "var(--cyan)" }}>⋮</span> → <span style={{ color: "var(--cyan)" }}>"Añadir a pantalla de inicio"</span>
                </p>
              </div>
            )
          )}

          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-semibold uppercase tracking-wide transition-all"
            style={{ color: "rgba(255,255,255,0.7)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
              <LogOut className="w-3.5 h-3.5" />
            </div>
            Cerrar sesión
          </button>
        </div>

      </aside>
    </>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="rounded-lg" style={{ padding: 1.5, background: "linear-gradient(135deg, var(--blue), var(--cyan), var(--violet))", lineHeight: 0 }}>
        <div className="rounded-[7px] p-1.5" style={{ background: "var(--sidebar)" }}>
          <Image src="/logo-diego-mejia.png" alt="Diego Mejía Dental Group" width={981} height={270}
            style={{ width: 118, height: "auto", display: "block" }} priority />
        </div>
      </div>
    );
  }
  return (
    <Image src="/logo-diego-mejia.png" alt="Diego Mejía Dental Group" width={981} height={270}
      style={{ width: "100%", maxWidth: 190, height: "auto", display: "block" }} priority />
  );
}
