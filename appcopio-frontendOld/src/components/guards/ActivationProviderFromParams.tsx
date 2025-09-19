import { Outlet, useParams } from "react-router-dom";
import { ActivationProvider } from "../../contexts/ActivationContext";

export default function ActivationProviderFromParams() {
  const { centerId } = useParams<{ centerId: string }>();
  return (
    <ActivationProvider centerId={centerId!}>
      <Outlet />
    </ActivationProvider>
  );
}
