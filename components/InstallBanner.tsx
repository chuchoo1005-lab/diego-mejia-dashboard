"use client";
import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt?: () => void;
  userChoice?: Promise<{ outcome: string }>;
}

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Ya instalada como app — no mostrar
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    // Ya la descartó en esta sesión
    if (sessionStorage.getItem("pwa-banner-dismissed")) return;

    const ios =
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))) &&
      !(window as { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    if (ios) {
      // iOS: mostrar banner con instrucciones siempre
      setTimeout(() => setShow(true), 2000);
    } else {
      // Android/Chrome: esperar el evento del browser
      const handler = (e: Event) => {
        e.preventDefault();
        setPrompt(e as BeforeInstallPromptEvent);
        setTimeout(() => setShow(true), 1500);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt?.();
    const result = await prompt.userChoice;
    if (result?.outcome === "accepted") handleDismiss();
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (!show || dismissed) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[999] rounded-2xl p-4 flex items-center gap-3 lg:hidden"
      style={{
        background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(10,10,10,0.98))",
        border: "1px solid rgba(6,182,212,0.35)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(6,182,212,0.1)",
      }}
    >
      {/* Icono */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.25)" }}
      >
        {isIOS ? (
          <Share className="w-5 h-5" style={{ color: "var(--cyan)" }} />
        ) : (
          <Download className="w-5 h-5" style={{ color: "var(--cyan)" }} />
        )}
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: "#fff" }}>
          Instalar como app
        </p>
        {isIOS ? (
          <p className="text-xs mt-0.5 leading-tight" style={{ color: "rgba(255,255,255,0.5)" }}>
            Toca <strong style={{ color: "var(--cyan)" }}>⎙ Compartir</strong> → <strong style={{ color: "var(--cyan)" }}>Añadir a inicio</strong>
          </p>
        ) : (
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
            Acceso directo desde tu pantalla de inicio
          </p>
        )}
      </div>

      {/* Botón instalar (solo Android) */}
      {!isIOS && prompt && (
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0"
          style={{ background: "var(--cyan)", color: "#000" }}
        >
          Instalar
        </button>
      )}

      {/* Cerrar */}
      <button onClick={handleDismiss} className="shrink-0 p-1" style={{ color: "rgba(255,255,255,0.3)" }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
