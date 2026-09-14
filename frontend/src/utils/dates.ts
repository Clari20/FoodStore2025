export const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

/** El backend serializa fechas en UTC sin sufijo de zona horaria, sin esto,
 * el navegador las interpreta como hora local y el horario queda corrido. */
export function parseBackendDate(value: string) {
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

export function formatArgentinaDate(value: string) {
  return parseBackendDate(value).toLocaleDateString("es-AR", {
    timeZone: ARGENTINA_TIME_ZONE,
  });
}

export function formatArgentinaTime(value: string) {
  return parseBackendDate(value).toLocaleTimeString("es-AR", {
    timeZone: ARGENTINA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatArgentinaDateTime(value: string) {
  return parseBackendDate(value).toLocaleString("es-AR", {
    timeZone: ARGENTINA_TIME_ZONE,
  });
}
