// src/pages/Auth/LoginPage.tsx
import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { msgFromError } from "@/lib/errors"; 
import "./LoginPage.css";

export default function LoginPage() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from =
    (location.state as { from?: Location })?.from?.pathname || "/";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      setError("Ingresa tu usuario y contraseña.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await login(u, p);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(msgFromError?.(err) || err?.message || "Credenciales inválidas.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Iniciar Sesión</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Usuario:</label>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña:</label>
            <div
              // inline para no tocar tu CSS
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="current-password"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                disabled={isSubmitting}
                // botón de texto sin tocar CSS global
                style={{
                  background: "none",
                  border: "none",
                  padding: "0 0.5rem",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button
            type="submit"
            className="login-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Accediendo..." : "Acceder"}
          </button>
        </form>
      </div>
    </div>
  );
}
