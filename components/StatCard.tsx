import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "teal" | "emerald" | "amber" | "rose" | "sky" | "violet";
  trend?: { value: number; label: string };
  delay?: number;
}

const colors = {
  teal:    { bg: "from-teal-500/20 to-cyan-500/10",     icon: "text-teal-300",    iconBg: "bg-teal-500/10 border-teal-500/20",   glow: "rgba(20,184,166,0.12)",  accent: "from-teal-500 to-cyan-400",    trendUp: "text-teal-300 bg-teal-500/12 border border-teal-500/20",    trendDown: "text-rose-300 bg-rose-500/12 border border-rose-500/20" },
  emerald: { bg: "from-emerald-500/20 to-green-500/10", icon: "text-emerald-300", iconBg: "bg-emerald-500/10 border-emerald-500/20", glow: "rgba(16,185,129,0.12)", accent: "from-emerald-500 to-green-400", trendUp: "text-emerald-300 bg-emerald-500/12 border border-emerald-500/20", trendDown: "text-rose-300 bg-rose-500/12 border border-rose-500/20" },
  amber:   { bg: "from-amber-500/20 to-yellow-500/10",  icon: "text-amber-300",   iconBg: "bg-amber-500/10 border-amber-500/20",  glow: "rgba(245,158,11,0.12)", accent: "from-amber-500 to-yellow-400", trendUp: "text-amber-300 bg-amber-500/12 border border-amber-500/20",   trendDown: "text-rose-300 bg-rose-500/12 border border-rose-500/20" },
  rose:    { bg: "from-rose-500/20 to-pink-500/10",     icon: "text-rose-300",    iconBg: "bg-rose-500/10 border-rose-500/20",    glow: "rgba(239,68,68,0.12)",  accent: "from-rose-500 to-pink-400",    trendUp: "text-emerald-300 bg-emerald-500/12 border border-emerald-500/20", trendDown: "text-rose-300 bg-rose-500/12 border border-rose-500/20" },
  sky:     { bg: "from-sky-500/20 to-blue-500/10",      icon: "text-sky-300",     iconBg: "bg-sky-500/10 border-sky-500/20",      glow: "rgba(56,189,248,0.12)", accent: "from-sky-500 to-blue-400",     trendUp: "text-sky-300 bg-sky-500/12 border border-sky-500/20",      trendDown: "text-rose-300 bg-rose-500/12 border border-rose-500/20" },
  violet:  { bg: "from-violet-500/20 to-purple-500/10", icon: "text-violet-300",  iconBg: "bg-violet-500/10 border-violet-500/20", glow: "rgba(139,92,246,0.12)", accent: "from-violet-500 to-purple-400", trendUp: "text-violet-300 bg-violet-500/12 border border-violet-500/20", trendDown: "text-rose-300 bg-rose-500/12 border border-rose-500/20" },
};

export default function StatCard({ title, value, subtitle, icon: Icon, color = "teal", trend, delay = 0 }: StatCardProps) {
  const c = colors[color];
  return (
    <div
      className="stat-card group animate-fade-in-up"
      style={{ "--glow-color": c.glow, animationDelay: `${delay}ms` } as React.CSSProperties}
    >
      {/* Top row: icon + trend */}
      <div className="flex items-start justify-between mb-5">
        {/* Icon with glow */}
        <div className="relative">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border bg-gradient-to-br ${c.bg} ${c.iconBg} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}
            style={{ boxShadow: `0 0 20px ${c.glow}` }}>
            <Icon className={`w-5 h-5 ${c.icon}`} />
          </div>
        </div>

        {trend && (
          <span className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-full flex items-center gap-1 backdrop-blur-sm ${
            trend.value >= 0 ? c.trendUp : c.trendDown
          }`}>
            <svg width="8" height="8" viewBox="0 0 10 10" className={trend.value < 0 ? "rotate-180" : ""}>
              <path d="M5 1L9 7H1L5 1Z" fill="currentColor" />
            </svg>
            {trend.value >= 0 ? "+" : ""}{trend.value}%
          </span>
        )}
      </div>

      {/* Number + label */}
      <div className="space-y-1.5">
        <p className="number-hero">{value}</p>
        <p className="text-[13px] font-medium text-white/45 tracking-wide">{title}</p>
        {subtitle && (
          <p className="text-[11px] text-white/25 flex items-center gap-1.5 mt-1">
            <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${c.accent} inline-block opacity-70`} />
            {subtitle}
          </p>
        )}
      </div>

      {/* Bottom gradient accent line */}
      <div className={`mt-5 h-[2px] rounded-full bg-gradient-to-r ${c.accent} opacity-20 group-hover:opacity-40 transition-opacity duration-300`} />
    </div>
  );
}
