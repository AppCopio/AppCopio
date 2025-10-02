/**
 * Realiza una petición fetch que puede ser cancelada.
 * Maneja la conversión a JSON y los errores comunes.
 *
 * @param url La URL a la que se hará la petición.
 * @param signal La señal del AbortController para cancelar la petición.
 * @returns Una promesa que resuelve con los datos en formato JSON.
 * @throws Lanza un error si la respuesta no es 'ok' o si la petición fue cancelada.
 */


export const fetchWithAbort = async <T>(url: string, signal: AbortSignal): Promise<T> => {
    const response = await fetch(url, { signal });

    if (!response.ok) {
        // Si el servidor responde con un error (4xx, 5xx), lanzamos una excepción.
        throw new Error(`Error en la petición: ${response.status} ${response.statusText}`);
    }

    // Si todo va bien, parseamos el JSON y lo retornamos.
    return response.json() as Promise<T>;
};  