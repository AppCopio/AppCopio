import * as React from "react";
import { getActiveActivation } from "@/services/centers.service";
import type { ActiveActivation } from "@/types/center";

type ActivationState = {
  loading: boolean;
  activation: ActiveActivation | null;
  refresh: () => Promise<void>;
};

const ActivationContext = React.createContext<ActivationState | null>(null);

export function ActivationProvider({
  centerId,
  children,
}: {
  centerId: string | number;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = React.useState(true);
  const [activation, setActivation] = React.useState<ActiveActivation | null>(
    null
  );

  const load = React.useCallback(async () => {
    const controller = new AbortController();
    setLoading(true);
    try {
      const a = await getActiveActivation(centerId, controller.signal);
      setActivation(a);
    } catch (err: any) {
      const isCanceled =
        err?.code === "ERR_CANCELED" ||
        err?.name === "CanceledError" ||
        err?.name === "AbortError";
      if (!isCanceled)
        console.error("[ActivationProvider] refresh error:", err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [centerId]);

  React.useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      try {
        const a = await getActiveActivation(centerId, controller.signal);
        if (mounted) setActivation(a);
      } catch (err: any) {
        // Ignorar cancelaciones
        const isCanceled =
          err?.code === "ERR_CANCELED" ||
          err?.name === "CanceledError" ||
          err?.name === "AbortError";
        if (!isCanceled) {
          console.error("[ActivationProvider] load error:", err);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [centerId]);

  const value = React.useMemo(
    () => ({ loading, activation, refresh: load }),
    [loading, activation, load]
  );

  return (
    <ActivationContext.Provider value={value}>
      {children}
    </ActivationContext.Provider>
  );
}

export function useActivation() {
  const ctx = React.useContext(ActivationContext);
  if (!ctx)
    throw new Error("useActivation must be used within <ActivationProvider>");
  return ctx;
}

// opcional: hook seguro que puede devolver null
export function useMaybeActivation() {
  return React.useContext(ActivationContext);
}
