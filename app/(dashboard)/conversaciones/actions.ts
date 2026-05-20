'use server'

const CW_URL = 'https://diagnostico-chatwoot.zhmz81.easypanel.host'
const CW_TOKEN = '9fhfgx5Tz4vonxAFhogeZSjL'
const CW_ACCOUNT = '3'

export async function getConversaciones() {
  const res = await fetch(
    `${CW_URL}/api/v1/accounts/${CW_ACCOUNT}/conversations?page=1&status=open`,
    { headers: { 'api_access_token': CW_TOKEN }, cache: 'no-store' }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.data?.payload ?? []
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
