'use server'

const CW_URL = 'https://diagnostico-chatwoot.zhmz81.easypanel.host'
const CW_TOKEN = '9fhfgx5Tz4vonxAFhogeZSjL'
const CW_ACCOUNT = '3'

export async function getConversaciones(status: 'open' | 'resolved' = 'open') {
  const res = await fetch(
    `${CW_URL}/api/v1/accounts/${CW_ACCOUNT}/conversations?page=1&status=${status}`,
    { headers: { 'api_access_token': CW_TOKEN }, cache: 'no-store' }
  )
  if (!res.ok) return []
  const data = await res.json()
  const payload = data.data?.payload ?? []
  const totalCount = data.data?.meta?.all_count ?? payload.length
  const totalPages = Math.max(1, Math.ceil(totalCount / 25))

  let todas = payload
  if (totalPages > 1) {
    const restoPaginas = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => i + 2).map(async (page) => {
        const r = await fetch(
          `${CW_URL}/api/v1/accounts/${CW_ACCOUNT}/conversations?page=${page}&status=${status}`,
          { headers: { 'api_access_token': CW_TOKEN }, cache: 'no-store' }
        )
        if (!r.ok) return []
        const d = await r.json()
        return d.data?.payload ?? []
      })
    )
    todas = [...payload, ...restoPaginas.flat()]
  }

  return todas.sort((a: any, b: any) => (b.last_activity_at ?? 0) - (a.last_activity_at ?? 0))
}

export async function getMensajes(convId: number) {
  const res = await fetch(
    `${CW_URL}/api/v1/accounts/${CW_ACCOUNT}/conversations/${convId}/messages`,
    { headers: { 'api_access_token': CW_TOKEN }, cache: 'no-store' }
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.payload ?? []).sort((a: any, b: any) => a.created_at - b.created_at)
}

// Link directo al chat en Chatwoot de un contacto, buscado por su identificador de WhatsApp.
// Sirve para los usuarios con nombre de usuario (BSUID "CO.…"): no tienen teléfono, pero sí conversación.
export async function urlChatChatwoot(identificador: string): Promise<string | null> {
  const s = await fetch(
    `${CW_URL}/api/v1/accounts/${CW_ACCOUNT}/contacts/search?q=${encodeURIComponent(identificador)}`,
    { headers: { 'api_access_token': CW_TOKEN }, cache: 'no-store' }
  )
  if (!s.ok) return null
  const contacto = ((await s.json()).payload ?? []).find((c: any) => c.identifier === identificador)
  if (!contacto) return null
  const c = await fetch(
    `${CW_URL}/api/v1/accounts/${CW_ACCOUNT}/contacts/${contacto.id}/conversations`,
    { headers: { 'api_access_token': CW_TOKEN }, cache: 'no-store' }
  )
  if (!c.ok) return null
  const convs = ((await c.json()).payload ?? []).sort((a: any, b: any) => (b.last_activity_at ?? 0) - (a.last_activity_at ?? 0))
  return convs.length ? `${CW_URL}/app/accounts/${CW_ACCOUNT}/conversations/${convs[0].id}` : null
}

export async function enviarMensaje(convId: number, contenido: string) {
  const res = await fetch(
    `${CW_URL}/api/v1/accounts/${CW_ACCOUNT}/conversations/${convId}/messages`,
    {
      method: 'POST',
      headers: { 'api_access_token': CW_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: contenido, message_type: 'outgoing', private: false }),
    }
  )
  return res.ok
}

export async function resolverConversacion(convId: number) {
  const res = await fetch(
    `${CW_URL}/api/v1/accounts/${CW_ACCOUNT}/conversations/${convId}/toggle_status`,
    {
      method: 'POST',
      headers: { 'api_access_token': CW_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    }
  )
  return res.ok
}
