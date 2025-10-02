import * as React from "react";
import { Outlet, useParams, Link } from "react-router-dom";
import "./CenterLayout.css";

import type { CenterData } from "@/types/center";
import { getOneCenter } from "@/services/centers.service";

import { paths } from "@/routes/paths";

type LayoutCenter = Pick<CenterData, "center_id" | "name" | "address">;

const CenterLayout: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>();
  const [center, setCenter] = React.useState<LayoutCenter | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!centerId) return;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await getOneCenter(centerId); // ! Retorna la data si no se envía el controller
        // Aseguramos shape mínimo (id como string para rutas)
        setCenter( data ?? null /*{
          data ?? null
         center_id: String(data.center_id),
          name: data.name,
          address: data.address ?? "",
        }*/);
      } catch (e: any) {
        if (e?.name !== "CanceledError" && e?.name !== "AbortError") {
          setErr("No se pudo cargar el centro.");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [centerId]);

  const id = centerId ?? "";
  const links = [
    { label: "Inventario",            to: paths.center.inventory(id) },
    { label: "Ver Detalles",          to: paths.center.details(id) },
    { label: "Crear Solicitud",       to: paths.center.needsNew(id) },
    { label: "Estado de Actualizaciones", to: paths.center.updates(id) },
    { label: "Listado de Personas",   to: paths.center.residents(id) },
    { label: "Registros de activación",   to: paths.center.datasets(id) },

  ];

  return (
    <div className="center-layout">
      <div className="center-header">
        <h2>Gestionando: {center ? center.name : `Centro ${centerId}`}</h2>

        {/* Mantiene la misma estructura y clases para que el CSS antiguo siga sirviendo */}
        <nav className="center-subnav">
          {links.map((l) => (
            <Link key={l.to} to={l.to}>{l.label}</Link>
          ))}
        </nav>
      </div>

      <main className="center-main-area">
        {loading && <div className="loading">Cargando centro…</div>}
        {!loading && err && <div className="error-message">{err}</div>}
        {!loading && !err && <Outlet />}
      </main>
    </div>
  );
};

export default CenterLayout;
