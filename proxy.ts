import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas protegidas — requieren sesión activa
const PROTECTED = ['/', '/pacientes', '/citas', '/notificaciones', '/metricas', '/recursos']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const isProtected = PROTECTED.some(p => path === p || path.startsWith(p + '/'))

  // Revisión local en modo prueba: deja ver /citas sin sesión (muestra pacientes inventados, no los reales,
  // porque la base no entrega datos sin sesión). Exige `next dev` + NEXT_PUBLIC_SOLO_LECTURA=1, que solo
  // existe en .env.development.local; el panel publicado nunca cumple esto.
  const revisionLocal = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SOLO_LECTURA === '1'
  if (!user && isProtected && revisionLocal && path === '/citas') return response

  // Sin sesión → redirigir al login
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Con sesión y en login → redirigir al panel
  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public).*)'],
}
