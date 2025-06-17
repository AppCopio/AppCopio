// src/pages/MapPage/MapPage.tsx
import React, { useState, useEffect }from 'react';
import MapComponent from '../../components/map/MapComponent'; // <-- 1. IMPORTA el componente del mapa

interface Center {
    center_id: string;
    name: string;
    address: string;
    type: 'Acopio' | 'Albergue';
    capacity: number;
    is_active: boolean;
    latitude: number; // Important: use number, as the backend sends numbers
    longitude: number; // Important: use number
    fullnessPercentage: number; // This field comes from the backend
}

const MapPage: React.FC = () => {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
        const fetchCenters = async () => {
            try {
                // The URL must point to the route we created in centerRoutes.ts in your backend
                const response = await fetch('http://localhost:4000/api/centers'); // Or the port you are using (e.g., 3000, 4000)
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data: Center[] = await response.json();
                setCenters(data);
            } catch (err: any) {
                console.error("Error fetching center data:", err); // Log the error
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCenters();
    }, []);

    if (loading) return <div>Cargando centros...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="map-page-container">
            {/* Pass the centers (now with fullness percentage) to the MapComponent */}
            <MapComponent centers ={centers} /> 
        </div>
    );
};

export default MapPage;