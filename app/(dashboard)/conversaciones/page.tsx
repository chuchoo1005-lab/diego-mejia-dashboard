export default function ConversacionesPage() {
  return (
    <div
      className="fixed inset-0 lg:left-[240px] top-0 flex flex-col"
      style={{ paddingTop: "0" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{
          background: "rgba(7,11,18,0.98)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(6,182,212,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--cyan)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Conversaciones</p>
            <p className="text-[10px]" style={{ color: "rgba(6,182,212,0.6)" }}>WhatsApp · Bandeja de entrada</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-400 font-medium">En vivo</span>
        </div>
      </div>

      {/* Chatwoot */}
      <div className="flex-1 relative">
        <iframe
          src="https://diagnostico-chatwoot.zhmz81.easypanel.host"
          className="absolute inset-0 w-full h-full border-0"
          allow="microphone; camera; clipboard-read; clipboard-write"
          title="Conversaciones WhatsApp"
        />
      </div>
    </div>
  )
}
