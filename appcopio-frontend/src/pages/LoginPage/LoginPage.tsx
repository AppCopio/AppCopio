// src/pages/LoginPage/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Para redirigir (simulado)
import './LoginPage.css';

const LoginPage: React.FC = () => {
  // Estados para guardar lo que el usuario escribe
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // Para mostrar errores

  const navigate = useNavigate(); // Hook para navegar

  // Función que se ejecuta al enviar el formulario
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault(); // Evita que la página se recargue

    // --- AQUÍ IRÁ LA LÓGICA DE CONEXIÓN AL BACKEND ---
    console.log('Intentando iniciar sesión con:', { username, password });

    // Simulación: Si escribe algo, lo dejamos pasar (¡SOLO PARA PRUEBAS!)
    if (username && password) {
      setError('');
      alert(`¡Bienvenido ${username}! (Simulación)`);
      // Redirigimos al inicio (o a un futuro Dashboard)
      navigate('/'); 
    } else {
      setError('Por favor, ingresa usuario y contraseña.');
    }
    // --- FIN DE LA SIMULACIÓN ---
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
              onChange={(e) => setUsername(e.target.value)} // Actualiza el estado
              placeholder="Tu nombre de usuario"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Contraseña:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)} // Actualiza el estado
              placeholder="Tu contraseña"
            />
          </div>

          {error && <p className="error-message">{error}</p>} 
          
          <button type="submit" className="login-button">
            Acceder
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;