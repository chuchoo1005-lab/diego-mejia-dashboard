// Precios promedio por tratamiento (estimados a partir de los rangos que el bot cotiza en WhatsApp).
// No es el monto real facturado — Supabase no registra pagos, solo el pipeline de leads.
// Compartido entre /roi y /metricas para estimar ingreso a partir de resultado_llamada + servicio_interes.
export const PRECIOS: Record<string, number> = {
  ortodoncia: 10000000, invisalign: 10000000, brackets: 8500000,
  diseno: 3000000, diseño: 3000000, blanqueamiento: 2000000,
  implantes: 1500000, endodoncia: 1500000, periodoncia: 1500000,
  cirugia: 1500000, rehabilitacion: 1500000, odontopediatria: 1500000,
  ortopedia: 1500000, general: 150000,
};
export const PRECIO_DEFAULT = 150000; // valoración — fallback cuando no se reconoce el servicio

export const COP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, notation: n >= 1000000 ? "compact" : "standard" }).format(n);
