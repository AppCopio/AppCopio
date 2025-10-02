import React, { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      style={{
        color: '#b71c1c',
        background: '#fff3cd',
        padding: 8,
        textAlign: 'center',
        fontWeight: 'bold',
        zIndex: 1099, // debajo de la navbar (navbar z-index: 1100)
        position: 'sticky',
        top: 60, // altura navbar
        width: '100%',
        boxShadow: '0 2px 4px rgba(0,0,0,0.07)',
      }}
    >
      Estás viendo datos guardados. Los cambios recientes pueden no estar reflejados.
    </div>
  );
}
