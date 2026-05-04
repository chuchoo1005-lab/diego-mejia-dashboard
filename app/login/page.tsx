"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Credenciales inválidas. Verifica tu correo y contraseña.");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0A0A0A" }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-black font-black tracking-widest px-3 py-1 text-lg"
              style={{ background: "#FFFFFF", fontFamily: "var(--font-cormorant)" }}>
              DIEGO
            </span>
            <span className="font-light tracking-widest border px-3 py-1 text-lg"
              style={{ color: "#FFFFFF", borderColor: "rgba(255,255,255,0.5)", fontFamily: "var(--font-cormorant)" }}>
              MEJÍA
            </span>
          </div>
          <p className="text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
            Panel Administrativo
          </p>
        </div>

        {/* Card */}
        <div className="dm-card p-7">
          <h2 className="text-lg font-semibold text-white mb-6" style={{ fontFamily: "var(--font-cormorant)" }}>
            Iniciar sesión
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="section-label block mb-2">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@diegomejia.com"
                  className="w-full pl-9 pr-4 py-3 text-sm text-white placeholder-white/20 rounded-sm transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }} />
              </div>
            </div>

            <div>
              <label className="section-label block mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-3 text-sm text-white placeholder-white/20 rounded-sm transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }} />
              </div>
            </div>

            {error && (
              <div className="text-xs py-2.5 px-3 rounded-sm" style={{ background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.2)", color: "#FF6666" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-sm transition-all disabled:opacity-50"
              style={{ background: "#FFFFFF", color: "#0A0A0A" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Ingresar <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-[10px] font-medium tracking-wider" style={{ color: "rgba(255,255,255,0.2)" }}>
          DIEGO MEJÍA DENTAL GROUP © 2026
        </p>
      </div>
    </div>
  );
}
