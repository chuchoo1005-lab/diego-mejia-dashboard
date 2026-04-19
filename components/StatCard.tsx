import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "navy" | "emerald" | "amber" | "rose" | "sky";
  trend?: { value: number; label: string };
}

const colors = {
  navy:    { bg: "bg-[#1a2740]/10", icon: "text-[#1a2740]",   border: "border-[#1a2740]/15" },
  emerald: { bg: "bg-emerald-50",   icon: "text-emerald-600",  border: "border-emerald-100" },
  amber:   { bg: "bg-amber-50",     icon: "text-amber-600",    border: "border-amber-100" },
  rose:    { bg: "bg-rose-50",      icon: "text-rose-600",     border: "border-rose-100" },
  sky:     { bg: "bg-sky-50",       icon: "text-sky-600",      border: "border-sky-100" },
};

export default function StatCard({ title, value, subtitle, icon: Icon, color = "navy", trend }: StatCardProps) {
  const c = colors[color];
  return (
    <div className={`bg-white border ${c.border} rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${trend.value >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            {trend.value >= 0 ? "+" : ""}{trend.value}%
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-[#1a2740] tracking-tight">{value}</p>
        <p className="text-sm font-medium text-slate-500 mt-1">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
