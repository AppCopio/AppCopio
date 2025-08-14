// src/pages/LoginPage/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // Se añade un estado para gestionar el envío del formulario.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  // La función se convierte en async para manejar futuras llamadas a API.
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Prevenir doble clic
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(''); // Limpia errores previos

    try {
      // En un futuro, aquí habría un: await login(username, password);
      // Por ahora, mantenemos la lógica de simulación.
      
      if (username.toLowerCase() === 'admin') {
        login({ username: 'admin', role: 'Emergencias' });
        navigate('/admin');
      } else if (username.toLowerCase().startsWith('encargado-')) {
        const centerId = username.split('-')[1].toUpperCase();
        login({ username: `encargado_${centerId}`, role: 'Encargado', centerId });
        navigate(`/center/${centerId}/inventory`);
      } else {
        // Si la lógica falla, lanzamos un error para que el catch lo maneje.
        throw new Error('Usuario no reconocido. Prueba con "admin" o "encargado-C001".');
      }
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('Ocurrió un error inesperado.');
        }
    } finally {
      // Se asegura de que el botón se reactive siempre, incluso si hay un error.
      setIsSubmitting(false);
    }
  };

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
              disabled={isSubmitting} // Deshabilita el input durante el envío
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
              disabled={isSubmitting} // Deshabilita el input durante el envío
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          {/* Se deshabilita el botón y cambia el texto durante el envío */}
          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting ? 'Accediendo...' : 'Acceder'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;