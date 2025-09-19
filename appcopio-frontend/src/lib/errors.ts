export function msgFromError(err: any, fallback: string = "Error desconocido"): string {
  return (
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    err?.message ??
    fallback
  );
}
