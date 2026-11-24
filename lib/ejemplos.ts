// Pacientes INVENTADOS para revisar el CRM en local sin iniciar sesión (solo en modo prueba).
// Nombres y teléfonos son ficticios. Nunca se usan en producción: solo se cargan si SOLO_LECTURA está activo
// y no hay sesión.
import type { Paciente } from "@/components/CallCard";

const ahora = Date.now();
const h = (horas: number) => new Date(ahora + horas * 3600_000).toISOString();
const dia = (dias: number) => { const d = new Date(ahora + dias * 86400_000); return d.toISOString().slice(0, 10); };
const cita = (dias: number, hora: string) => `${dia(dias)}T${hora}`;

let n = 0;
function pac(nombre: string, perfil: Record<string, unknown>): Paciente {
  n++;
  return {
    id: `ejemplo-${n}`, alias: `DM-EJ${String(n).padStart(2, "0")}`, calificado: true,
    telefono_encriptado: `57300000${String(n).padStart(4, "0")}`, modo_humano: false, updated_at: h(-n),
    perfil_paciente: {
      nombre, estado_conv: "entrega_premium", score: 70, nivel_interes: "alto", ultima_actividad_at: h(-n * 3),
      origen_agente: n % 2 ? "agente_nuevo" : undefined,
      notas_internas: n % 2 ? "Agente nuevo · Sin dato de cuándo quiere iniciar" : "",
      ...perfil,
    },
  };
}

export function pacientesDeEjemplo(): { leads: Paciente[]; sinTerminar: Set<string> } {
  n = 0;
  const leads = [
    pac("Laura Gómez (ejemplo)", { servicio_interes: "diseno", horario_contacto: "tarde", resumen_lead: "Quiere mejorar color y forma de los dientes de arriba. Preguntó por resina y cerámica." }),
    pac("Andrés Castaño (ejemplo)", { servicio_interes: "invisalign", horario_contacto: "mañana", resumen_lead: "Tiene los dientes apiñados, ya usó brackets hace años." }),
    pac("Marta Ruiz (ejemplo)", { servicio_interes: "blanqueamiento", estado_conv: "nuevo", nombre: "Marta Ruiz (ejemplo)" }),
    pac("Sofía León (ejemplo)", { servicio_interes: "diseno", resultado_llamada: "no_contesto", intentos_llamada: 1, proximo_intento_el: dia(0), ultima_llamada_at: h(-20), resultado_at: h(-20),
      historial_crm: [{ at: h(-20), valor: "no_contesto" }] }),
    pac("Camilo Rojas (ejemplo)", { servicio_interes: "implantes", resultado_llamada: "no_contesto", intentos_llamada: 3, proximo_intento_el: dia(1), ultima_llamada_at: h(-5), resultado_at: h(-5),
      historial_crm: [{ at: h(-72), valor: "no_contesto" }, { at: h(-30), valor: "no_contesto" }, { at: h(-5), valor: "no_contesto" }] }),
    pac("Paola Díaz (ejemplo)", { servicio_interes: "diseno", resultado_llamada: "volver_llamar", volver_llamar_el: dia(0), ultima_llamada_at: h(-26), resultado_at: h(-26),
      historial_crm: [{ at: h(-26), valor: "volver_llamar", fecha: dia(0) }] }),
    pac("Jorge Peña (ejemplo)", { servicio_interes: "brackets", resultado_llamada: "volver_llamar", volver_llamar_el: dia(-2), ultima_llamada_at: h(-80), resultado_at: h(-80) }),
    pac("Natalia Mora (ejemplo)", { servicio_interes: "diseno", resultado_llamada: "pensando", ultima_llamada_at: h(-48), resultado_at: h(-48),
      historial_crm: [{ at: h(-50), valor: "no_contesto" }, { at: h(-48), valor: "pensando" }] }),
    pac("Diana Vargas (ejemplo)", { servicio_interes: "invisalign", resultado_llamada: "proceso", resultado_at: h(-200) }),
    pac("Valentina Cruz (ejemplo)", { servicio_interes: "diseno", resultado_llamada: "cerrado", cita_valoracion_at: cita(1, "09:00"), resultado_at: h(-24),
      historial_crm: [{ at: h(-24), valor: "cerrado", fecha: cita(1, "09:00") }] }),
    pac("Ricardo Silva (ejemplo)", { servicio_interes: "implantes", resultado_llamada: "cerrado", cita_valoracion_at: cita(-1, "15:00"), resultado_at: h(-90) }),
    pac("Lorena Salas (ejemplo)", { servicio_interes: "general", resultado_llamada: "cerrado", resultado_at: h(-300) }),
    pac("Juliana Ortiz (ejemplo)", { servicio_interes: "diseno", resultado_llamada: "reprogramo", cita_valoracion_at: cita(4, "11:30"), cita_anterior_at: cita(-1, "10:00"), reprogramaciones: 1, resultado_at: h(-30),
      historial_crm: [{ at: h(-100), valor: "cerrado", fecha: cita(-1, "10:00") }, { at: h(-30), valor: "reprogramo", fecha: cita(4, "11:30") }] }),
    pac("Felipe Ramos (ejemplo)", { servicio_interes: "invisalign", resultado_llamada: "asistio", cita_valoracion_at: cita(-3, "16:00"), resultado_at: h(-70) }),
    pac("Carolina Ávila (ejemplo)", { servicio_interes: "blanqueamiento", resultado_llamada: "no_asistio", cita_valoracion_at: cita(-2, "08:30"), resultado_at: h(-40) }),
    pac("Esteban Gil (ejemplo)", { servicio_interes: "diseno", resultado_llamada: "no_interesado", resultado_at: h(-60) }),
  ];
  // "Marta" se muestra en "Sin terminar": empezó el registro y no lo completó.
  return { leads, sinTerminar: new Set(["ejemplo-3"]) };
}
