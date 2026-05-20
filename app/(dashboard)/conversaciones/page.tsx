import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ExternalLink, MessageSquare, Clock, User, CheckCircle2, AlertCircle, Circle } from 'lucide-react'

const CW_URL = 'https://diagnostico-chatwoot.zhmz81.easypanel.host'
const CW_TOKEN = '9fhfgx5Tz4vonxAFhogeZSjL'
const CW_ACCOUNT = '3'

async function getConversaciones() {
  try {
    const res = await fetch(
      `${CW_URL}/api/v1/accounts/${CW_ACCOUNT}/conversations?page=1`,
      {
        headers: { 'api_access_token': CW_TOKEN },
        next: { revalidate: 30 },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.data?.payload ?? []
  } catch {
    return []
  }
}

function statusColor(status: string) {
  if (status === 'open') return '#10b981'
  if (status === 'resolved') return 'rgba(6,182,212,0.7)'
  if (status === 'pending') return '#f59e0b'
  return 'rgba(255,255,255,0.3)'
}

function statusLabel(status: string) {
  if (status === 'open') return 'Abierta'
  if (status === 'resolved') return 'Resuelta'
  if (status === 'pending') return 'Pendiente'
  return status
}

function timeAgo(ts: number) {
  try {
    return formatDistanceToNow(new Date(ts * 1000), { addSuffix: true, locale: es })
  } catch {
    return '—'
  }
}

export default async function ConversacionesPage() {
  const conversaciones = await getConversaciones()

  const abiertas = conversaciones.filter((c: any) => c.status === 'open').length
  const pendientes = conversaciones.filter((c: any) => c.status === 'pending').length
  const resueltas = conversaciones.filter((c: any) => c.status === 'resolved').length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Conversaciones</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            WhatsApp · Bandeja de entrada en tiempo real
          </p>
        </div>
        <a
          href={`${CW_URL}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: 'rgba(6,182,212,0.1)',
            color: 'var(--cyan)',
            border: '1px solid rgba(6,182,212,0.25)',
          }}
        >
          <ExternalLink className="w-4 h-4" />
          Abrir bandeja completa
        </a>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Abiertas', value: abiertas, color: '#10b981', icon: AlertCircle },
          { label: 'Pendientes', value: pendientes, color: '#f59e0b', icon: Clock },
          { label: 'Resueltas', value: resueltas, color: 'rgba(6,182,212,0.7)', icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5" style={{ color }} />
              <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Lista de conversaciones */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Recientes ({conversaciones.length})
          </p>
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: '#10b981' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            En vivo · actualiza cada 30s
          </span>
        </div>

        {conversaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <MessageSquare className="w-8 h-8 mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin conversaciones aún</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.15)' }}>Los mensajes de WhatsApp aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversaciones.map((conv: any) => {
              const contact = conv.meta?.sender
              const lastMsg = conv.last_non_activity_message
              const convUrl = `${CW_URL}/app/accounts/${CW_ACCOUNT}/conversations/${conv.id}`

              return (
                <a
                  key={conv.id}
                  href={convUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 p-4 rounded-xl transition-all group cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{ background: 'rgba(6,182,212,0.12)', color: 'var(--cyan)' }}>
                    {(contact?.name ?? '?').charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {contact?.name ?? contact?.phone_number ?? 'Desconocido'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md shrink-0 font-medium"
                        style={{ background: `${statusColor(conv.status)}18`, color: statusColor(conv.status) }}>
                        {statusLabel(conv.status)}
                      </span>
                      {conv.unread_count > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0"
                          style={{ background: '#10b981', color: '#fff' }}>
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {lastMsg?.content ?? 'Sin mensajes'}
                    </p>
                  </div>

                  {/* Time + arrow */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {timeAgo(conv.last_activity_at)}
                    </span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: 'var(--cyan)' }} />
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
