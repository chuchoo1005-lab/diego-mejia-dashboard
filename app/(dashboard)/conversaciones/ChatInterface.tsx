'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, CheckCheck, Check, Clock, MessageSquare, RefreshCw, CheckCircle2, Phone, User } from 'lucide-react'
import { getConversaciones, getMensajes, enviarMensaje, resolverConversacion } from './actions'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'

function timeAgo(ts: number) {
  try { return formatDistanceToNow(new Date(ts * 1000), { addSuffix: true, locale: es }) }
  catch { return '—' }
}

function timeMsg(ts: number) {
  try { return format(new Date(ts * 1000), 'HH:mm') }
  catch { return '' }
}

export default function ChatInterface() {
  const [conversaciones, setConversaciones] = useState<any[]>([])
  const [convActiva, setConvActiva] = useState<any>(null)
  const [mensajes, setMensajes] = useState<any[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState<'open' | 'resolved'>('open')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const cargarConversaciones = useCallback(async () => {
    const data = await getConversaciones()
    setConversaciones(data)
    setCargando(false)
  }, [])

  const cargarMensajes = useCallback(async (convId: number) => {
    const data = await getMensajes(convId)
    setMensajes(data)
  }, [])

  useEffect(() => {
    cargarConversaciones()
    const interval = setInterval(cargarConversaciones, 8000)
    return () => clearInterval(interval)
  }, [cargarConversaciones])

  useEffect(() => {
    if (!convActiva) return
    cargarMensajes(convActiva.id)
    const interval = setInterval(() => cargarMensajes(convActiva.id), 4000)
    return () => clearInterval(interval)
  }, [convActiva, cargarMensajes])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const handleSend = async () => {
    if (!texto.trim() || !convActiva || enviando) return
    const contenido = texto.trim()
    setTexto('')
    setEnviando(true)
    // Optimistic update
    setMensajes(prev => [...prev, {
      id: Date.now(), content: contenido, message_type: 'outgoing',
      created_at: Math.floor(Date.now() / 1000), status: 'sent'
    }])
    await enviarMensaje(convActiva.id, contenido)
    await cargarMensajes(convActiva.id)
    setEnviando(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleResolver = async () => {
    if (!convActiva) return
    await resolverConversacion(convActiva.id)
    setConvActiva(null)
    await cargarConversaciones()
  }

  const convsFiltradas = conversaciones.filter(c => c.status === filtro)

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(6,182,212,0.1)', background: 'rgba(7,11,18,0.8)' }}>

      {/* ── LISTA IZQUIERDA ── */}
      <div className={`flex flex-col ${convActiva ? 'hidden md:flex' : 'flex'} w-full md:w-[320px] shrink-0`}
        style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Header lista */}
        <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-white text-sm">WhatsApp</p>
            <button onClick={cargarConversaciones} className="p-1.5 rounded-lg transition-all"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {(['open', 'resolved'] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: filtro === f ? 'rgba(6,182,212,0.15)' : 'transparent',
                  color: filtro === f ? 'var(--cyan)' : 'rgba(255,255,255,0.3)',
                }}>
                {f === 'open' ? 'Activas' : 'Resueltas'}
              </button>
            ))}
          </div>
        </div>

        {/* Conversaciones */}
        <div className="flex-1 overflow-y-auto">
          {cargando ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
            </div>
          ) : convsFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <MessageSquare className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Sin conversaciones</p>
            </div>
          ) : (
            convsFiltradas.map((conv: any) => {
              const contact = conv.meta?.sender
              const lastMsg = conv.last_non_activity_message
              const isActive = convActiva?.id === conv.id
              const hasUnread = conv.unread_count > 0

              return (
                <button key={conv.id} onClick={() => setConvActiva(conv)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                  style={{
                    background: isActive ? 'rgba(6,182,212,0.08)' : 'transparent',
                    borderLeft: `2px solid ${isActive ? 'var(--cyan)' : 'transparent'}`,
                  }}>
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{ background: 'rgba(6,182,212,0.12)', color: 'var(--cyan)' }}>
                    {(contact?.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold truncate" style={{ color: hasUnread ? 'white' : 'rgba(255,255,255,0.7)' }}>
                        {contact?.name ?? contact?.phone_number ?? 'Desconocido'}
                      </span>
                      <span className="text-[10px] shrink-0 ml-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {timeAgo(conv.last_activity_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {lastMsg?.content ?? 'Sin mensajes'}
                      </p>
                      {hasUnread && (
                        <span className="shrink-0 ml-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: '#10b981', color: 'white' }}>
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── CHAT DERECHA ── */}
      <div className={`flex-1 flex flex-col ${!convActiva ? 'hidden md:flex' : 'flex'}`}>
        {!convActiva ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <MessageSquare className="w-10 h-10" style={{ color: 'rgba(6,182,212,0.2)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>Selecciona una conversación</p>
          </div>
        ) : (
          <>
            {/* Header chat */}
            <div className="flex items-center gap-3 px-5 py-3 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <button onClick={() => setConvActiva(null)} className="md:hidden p-1.5 rounded-lg mr-1"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                ←
              </button>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ background: 'rgba(6,182,212,0.12)', color: 'var(--cyan)' }}>
                {(convActiva.meta?.sender?.name ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {convActiva.meta?.sender?.name ?? convActiva.meta?.sender?.phone_number ?? 'Desconocido'}
                </p>
                <p className="text-[10px]" style={{ color: 'rgba(6,182,212,0.5)' }}>
                  {convActiva.meta?.sender?.phone_number ?? 'WhatsApp'}
                </p>
              </div>
              <button onClick={handleResolver}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Resolver
              </button>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5"
              style={{ background: 'rgba(0,0,0,0.2)' }}>
              {mensajes.map((msg: any) => {
                const isOutgoing = msg.message_type === 'outgoing'
                if (!msg.content) return null
                return (
                  <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%] rounded-2xl px-3.5 py-2"
                      style={{
                        background: isOutgoing ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.07)',
                        borderTopRightRadius: isOutgoing ? '4px' : '16px',
                        borderTopLeftRadius: isOutgoing ? '16px' : '4px',
                      }}>
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap"
                        style={{ color: isOutgoing ? 'rgba(6,182,212,0.95)' : 'rgba(255,255,255,0.85)' }}>
                        {msg.content}
                      </p>
                      <div className={`flex items-center gap-1 mt-1 ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {timeMsg(msg.created_at)}
                        </span>
                        {isOutgoing && (
                          <CheckCheck className="w-3 h-3" style={{ color: 'rgba(6,182,212,0.5)' }} />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje... (Enter para enviar)"
                  rows={1}
                  className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'white',
                    maxHeight: '120px',
                  }}
                  onInput={e => {
                    const t = e.target as HTMLTextAreaElement
                    t.style.height = 'auto'
                    t.style.height = Math.min(t.scrollHeight, 120) + 'px'
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!texto.trim() || enviando}
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all"
                  style={{
                    background: texto.trim() ? 'var(--cyan)' : 'rgba(255,255,255,0.06)',
                    color: texto.trim() ? '#080C14' : 'rgba(255,255,255,0.2)',
                  }}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
