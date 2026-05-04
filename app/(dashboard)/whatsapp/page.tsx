"use client";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Wifi, WifiOff, Smartphone, CheckCircle, AlertCircle, QrCode } from "lucide-react";

interface WAStatus {
  connected: boolean;
  state: string;
  instance: string;
  qr: string | null;
  pairingCode: string | null;
  qrBase64: string | null;
  error?: string;
}

export default function WhatsAppPage() {
  const [status, setStatus] = useState<WAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
      const data = await res.json();
      setStatus(data);
      setLastCheck(new Date());
    } catch {
      setStatus({ connected: false, state: "error", instance: "diego-mejia-demo", qr: null, pairingCode: null, qrBase64: null, error: "No se pudo conectar con Evolution API" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
    if (!autoRefresh) return;
    // Refresh every 10s when disconnected (waiting for QR scan), every 30s when connected
    const interval = setInterval(check, status?.connected ? 30000 : 10000);
    return () => clearInterval(interval);
  }, [check, autoRefresh, status?.connected]);

  const isConnected = status?.connected;
  const qrImage = status?.qrBase64;
  const pairingCode = status?.pairingCode;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">

      {/* Header */}
      <div>
        <p className="section-label mb-2">Configuración del sistema</p>
        <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem", fontWeight: 500, color: "var(--text)", lineHeight: 1.1 }}>
          Conexión WhatsApp
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
          Gestiona la conexión del número de WhatsApp con el agente IA
        </p>
      </div>

      {/* Estado conexión */}
      <div className="dm-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <Wifi className="w-5 h-5" style={{ color: "var(--green)" }} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <WifiOff className="w-5 h-5" style={{ color: "var(--red)" }} />
              </div>
            )}
            <div>
              <p className="font-bold" style={{ color: "var(--text)" }}>
                {isConnected ? "WhatsApp conectado" : "WhatsApp desconectado"}
              </p>
              <p className="text-xs" style={{ color: "var(--text-3)" }}>
                Instancia: {status?.instance ?? "diego-mejia-demo"} · Estado: {status?.state ?? "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-400 active-dot" : "bg-red-400"}`}
              style={isConnected ? { boxShadow: "0 0 8px rgba(52,211,153,0.7)" } : {}} />
            <button onClick={check} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              Verificar
            </button>
          </div>
        </div>

        <p className="text-xs" style={{ color: "var(--text-3)" }}>
          Última verificación: {lastCheck.toLocaleTimeString("es-CO")}
          <button onClick={() => setAutoRefresh(!autoRefresh)} className="ml-3 underline" style={{ color: autoRefresh ? "var(--cyan)" : "var(--text-3)" }}>
            Auto-refresh: {autoRefresh ? "activo" : "pausado"}
          </button>
        </p>
      </div>

      {/* QR Code / Pairing */}
      {!isConnected && (
        <div className="dm-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
              <QrCode className="w-5 h-5" style={{ color: "var(--cyan)" }} />
            </div>
            <div>
              <p className="section-label mb-0.5">Escanear para conectar</p>
              <h2 className="font-bold" style={{ color: "var(--text)", fontFamily: "var(--font-cormorant)", fontSize: "1.1rem" }}>
                Código QR de WhatsApp
              </h2>
            </div>
          </div>

          {status?.error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--red)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>Error al obtener QR</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{status.error}</p>
              <button onClick={check} className="mt-4 px-4 py-2 rounded-lg text-sm"
                style={{ background: "rgba(6,182,212,0.1)", color: "var(--cyan)", border: "1px solid rgba(6,182,212,0.2)" }}>
                Reintentar
              </button>
            </div>
          ) : qrImage ? (
            <div className="flex flex-col items-center">
              {/* QR Image */}
              <div className="p-4 rounded-2xl mb-4" style={{ background: "#FFFFFF" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImage.startsWith("data:") ? qrImage : `data:image/png;base64,${qrImage}`}
                  alt="WhatsApp QR Code"
                  width={220}
                  height={220}
                  style={{ display: "block", imageRendering: "pixelated" }}
                />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
                Escanea con WhatsApp para conectar
              </p>
              <p className="text-xs text-center" style={{ color: "var(--text-3)" }}>
                Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo → Escanear QR
              </p>
              {pairingCode && (
                <div className="mt-4 px-4 py-3 rounded-xl text-center" style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-3)" }}>Código de vinculación alternativo</p>
                  <p className="text-2xl font-black tracking-[0.3em]" style={{ color: "var(--cyan)" }}>{pairingCode}</p>
                </div>
              )}
              <div className="flex items-center gap-2 mt-4 text-xs" style={{ color: "var(--text-3)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 active-dot" />
                El QR expira en 60 segundos — se actualiza automáticamente
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "rgba(6,182,212,0.2)", borderTopColor: "var(--cyan)" }} />
              <p className="text-sm" style={{ color: "var(--text-2)" }}>Generando código QR...</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Conectando con Evolution API</p>
            </div>
          )}
        </div>
      )}

      {/* Conectado exitosamente */}
      {isConnected && (
        <div className="dm-card p-6 text-center" style={{ borderColor: "rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.03)" }}>
          <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--green)" }} />
          <h2 className="font-bold text-lg mb-1" style={{ color: "var(--text)", fontFamily: "var(--font-cormorant)" }}>
            WhatsApp conectado correctamente
          </h2>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>
            El agente IA está recibiendo y respondiendo mensajes de WhatsApp
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs" style={{ color: "var(--text-3)" }}>
            <div className="glow-dot" style={{ width: 8, height: 8 }} />
            Sistema activo · Los mensajes se procesan automáticamente
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div className="dm-card p-5">
        <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>Cómo conectar WhatsApp</h3>
        <ol className="space-y-2.5">
          {[
            "Abre WhatsApp en tu teléfono",
            "Ve a Configuración → Dispositivos vinculados",
            'Toca "Vincular un dispositivo"',
            "Escanea el código QR que aparece arriba",
            "WhatsApp confirmará la conexión automáticamente",
          ].map((paso, i) => (
            <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "var(--text-2)" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                style={{ background: "rgba(6,182,212,0.1)", color: "var(--cyan)", border: "1px solid rgba(6,182,212,0.2)" }}>
                {i + 1}
              </span>
              {paso}
            </li>
          ))}
        </ol>
        <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)" }}>
          <p className="text-xs" style={{ color: "var(--amber)" }}>
            ⚠️ El teléfono debe tener conexión a internet mientras el agente esté activo.
            Si el QR expira, presiona Verificar para obtener uno nuevo.
          </p>
        </div>
      </div>
    </div>
  );
}
