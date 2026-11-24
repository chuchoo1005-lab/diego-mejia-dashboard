import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const cliente = createBrowserClient(supabaseUrl, supabaseKey)

// Modo de prueba: solo se activa con NEXT_PUBLIC_SOLO_LECTURA=1 (archivo .env.development.local, que
// `next build` no carga, así que en producción nunca está activo). Sirve para revisar el panel en local
// con los pacientes reales sin guardar nada: las escrituras responden "ok" pero no llegan a la base.
export const SOLO_LECTURA = process.env.NEXT_PUBLIC_SOLO_LECTURA === '1'

const ESCRITURAS = new Set(['update', 'insert', 'upsert', 'delete'])
function respuestaVacia(): unknown {
  const r = { data: null, error: null, count: null, status: 200, statusText: 'OK' }
  const cadena: unknown = new Proxy(function () {}, {
    get: (_t, prop) => (prop === 'then' ? (ok: (v: unknown) => unknown) => Promise.resolve(r).then(ok) : () => cadena),
    apply: () => cadena,
  })
  return cadena
}

export const supabase: typeof cliente = SOLO_LECTURA
  ? new Proxy(cliente, {
      get(target, prop, recv) {
        if (prop === 'rpc') return () => respuestaVacia()
        if (prop !== 'from') return Reflect.get(target, prop, recv)
        return (tabla: string) => {
          const q = target.from(tabla)
          return new Proxy(q, {
            get(t, p, r) {
              if (typeof p === 'string' && ESCRITURAS.has(p)) {
                return (...args: unknown[]) => { console.info('[modo prueba] no se guardó:', tabla, p, args[0]); return respuestaVacia() }
              }
              const v = Reflect.get(t, p, r)
              return typeof v === 'function' ? v.bind(t) : v
            },
          })
        }
      },
    })
  : cliente
