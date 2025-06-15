// src/pages/LoginPage/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // <-- IMPORTA EL HOOK
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth(); // <-- USA EL CONTEXTO

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    // --- LÓGICA DE SIMULACIÓN ---
    if (username.toLowerCase() === 'admin') {
      // Si el usuario es 'admin', lo logueamos como rol 'Emergencias'
      login({ username: 'admin', role: 'Emergencias' });
      navigate('/admin'); // Lo redirigimos al dashboard de admin
    } else if (username.toLowerCase().startsWith('encargado-')) {
      // Si empieza con 'encargado-', ej: "encargado-C001"
      const centerId = username.split('-')[1].toUpperCase();
      login({ username: `encargado_${centerId}`, role: 'Encargado', centerId });
      navigate(`/center/${centerId}/inventory`); // Lo redirigimos a su inventario
    } else {
      setError('Usuario no reconocido. Prueba con "admin" o "encargado-C001".');
    }
  };

 
  //USERS: admin o encargado-CXXX ej: encargado-C001
  //se puede poner cualquier cosa en la contraseña o dejar en blanc
  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Iniciar Sesión</h2>
        <p>Acceso para Municipalidad y Encargados de Centro.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Usuario:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu nombre de usuario"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="login-button">Acceder</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;