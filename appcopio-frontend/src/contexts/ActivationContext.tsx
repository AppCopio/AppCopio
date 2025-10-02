import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getActiveActivation } from "../services/centerApi";
import { ActiveActivation } from "../types/center";

type ActivationState = {
  loading: boolean;
  activation: ActiveActivation | null;
  refresh: () => Promise<void>;
};

const ActivationContext = createContext<ActivationState | null>(null);

export function ActivationProvider({ centerId, children }: { centerId: string | number; children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [activation, setActivation] = useState<ActiveActivation | null>(null);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const act = await getActiveActivation(centerId, { signal });
      setActivation(act);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [centerId]);

  useEffect(() => { 
    const ctrl =  new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort() 
  }, [centerId]);

  const value = useMemo(() => ({ loading, activation, refresh: () => load() }), [loading, activation]);
  return <ActivationContext.Provider value={value}>{children}</ActivationContext.Provider>;
}

export function useActivation() {
  const ctx = useContext(ActivationContext);
  if (!ctx) throw new Error("useActivation must be used within <ActivationProvider>");
  return ctx;
}