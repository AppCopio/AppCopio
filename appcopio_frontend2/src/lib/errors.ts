export function msgFromError(err: any, fallback: string = "Error desconocido"): string {
  return (
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    err?.message ??
    fallback
  );
}

/**
 * Verifica si un error es causado por la cancelación de una petición (AbortController).
 * Estos errores son normales cuando un componente se desmonta o una petición se cancela intencionalmente.
 * 
 * @param error - El error a verificar
 * @returns true si el error es por cancelación, false en caso contrario
 * 
 * @example
 * ```typescript
 * try {
 *   await api.get('/data', { signal });
 * } catch (error) {
 *   if (isCancelError(error)) return; // Ignorar cancelaciones
 *   console.error('Error real:', error);
 * }
 * ```
 */
export function isCancelError(error: any): boolean {
  return (
    error?.name === 'CanceledError' || 
    error?.code === 'ERR_CANCELED' ||
    error?.message === 'canceled'
  );
}
