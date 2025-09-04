// src/components/layout/CenterLayout/CenterLayout.tsx
import React, { useEffect, useState } from 'react';
import { Outlet, useParams, Link } from 'react-router-dom';
import './CenterLayout.css';
import { fetchWithAbort } from '../../../services/api';

type LayoutCenter = {
  center_id: string;
  name: string;
  address?: string;
};

const CenterLayout: React.FC = () => {
  const { centerId } = useParams<{ centerId: string }>(); 
  const apiUrl = import.meta.env.VITE_API_URL;

  const [center, setCenter] = useState<LayoutCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId) return;
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await fetchWithAbort<LayoutCenter>(
          `${apiUrl}/centers/${centerId}`,
          controller.signal
        );
        setCenter(data);
      } catch (e) {
        if (!(e instanceof Error && e.name === 'AbortError')) {
          setErr('No se pudo cargar el centro.');
        }
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [centerId, apiUrl]);

  return (
    <div className="center-layout">

      <div className="center-header">

        <h2>
          Gestionando: {center ? center.name : `Centro ${centerId}`}
        </h2>
        <nav className="center-subnav">
          <Link to={`/center/${centerId}/inventory`}>Inventario</Link>
          <Link to={`/center/${centerId}/details`}>Ver Detalles</Link>
          <Link to={`/center/${centerId}/needs/new`}>Crear Solicitud</Link>
          <Link to={`/center/${centerId}/updates`}>Estado de Actualizaciones</Link>
          <Link to={`/center/${centerId}/residents`}>Listado de Personas</Link>

        </nav>
      </div>

      <main className="center-main-area">
        <Outlet />
      </main>
    </div>
  );
};

export default CenterLayout;
