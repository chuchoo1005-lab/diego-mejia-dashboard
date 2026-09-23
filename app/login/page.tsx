"use client";
import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{
      background: "radial-gradient(900px 520px at 15% -10%, rgba(76,141,255,0.16), transparent 60%), radial-gradient(700px 480px at 100% 100%, rgba(47,224,232,0.09), transparent 55%), #06080D",
    }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-8">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute -inset-6 rounded-full logo-halo" />
            <div className="relative rounded-2xl" style={{ padding: 1.5, background: "linear-gradient(135deg, var(--blue), var(--cyan), var(--violet), var(--blue))", backgroundSize: "300% 300%", animation: "logoBorder 6s linear infinite" }}>
              <div className="rounded-[15px] overflow-hidden relative p-6" style={{ background: "#06080D" }}>
                <Image src="/logo-diego-mejia.png" alt="Diego Mejía Dental Group" width={981} height={270}
                  style={{ width: "100%", maxWidth: 240, height: "auto", display: "block" }} priority />
                <motion.div className="absolute inset-y-0 pointer-events-none" style={{ width: "45%", background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.4), transparent)" }}
                  initial={{ left: "-60%" }} animate={{ left: "130%" }} transition={{ duration: 1.3, delay: 0.7, ease: "easeInOut" }} />
              </div>
            </div>
          </div>
          <p className="text-sm font-semibold tracking-[0.3em] uppercase" style={{ background: "linear-gradient(90deg, var(--cyan), var(--blue))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Panel Administrativo
          </p>
        </motion.div>

        {/* Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="dm-card p-7">
          <h2 className="text-lg font-semibold text-white mb-6" style={{ fontFamily: "var(--font-cormorant)" }}>
            Iniciar sesión
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="section-label block mb-2">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-3)" }} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@diegomejia.com"
                  className="w-full pl-9 pr-4 py-3 text-sm text-white placeholder-white/20 rounded-lg transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}
                  onFocus={e => e.currentTarget.style.borderColor = "rgba(76,141,255,0.5)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--border)"} />
              </div>
            </div>

            <div>
              <label className="section-label block mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-3)" }} />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-3 text-sm text-white placeholder-white/20 rounded-lg transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}
                  onFocus={e => e.currentTarget.style.borderColor = "rgba(76,141,255,0.5)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--border)"} />
              </div>
            </div>

            {error && (
              <div className="text-sm py-2.5 px-3 rounded-lg" style={{ background: "var(--red-dim)", border: "1px solid rgba(255,95,109,0.3)", color: "#FF9AA2" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(90deg, var(--cyan), var(--blue))", color: "#04121A", boxShadow: "0 4px 20px rgba(76,141,255,0.3)" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Ingresar <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </motion.div>

        <p className="text-center mt-8 text-[13px] font-medium tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>
          DIEGO MEJÍA DENTAL GROUP © 2026
        </p>
      </div>
    </div>
  );
}
