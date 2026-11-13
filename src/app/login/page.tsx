'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import './login.css';

const slides = [
  { src: '/fondo/utcfondo.jpg', alt: 'Campus 1' },
  { src: '/fondo/utcconfe.jpg', alt: 'Campus 2' },
  { src: '/fondo/utcconfe2.jpg', alt: 'Campus 3' },
  { src: '/fondo/utcalumn.jpg', alt: 'Campus 4' },
  { src: '/fondo/utc.jpg', alt: 'Campus 5' },
];

export default function LoginPage() {
  const router = useRouter();
  const [slideIndex, setSlideIndex] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSlideIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No fue posible iniciar sesión.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Error de conexión con el servidor.');
      setLoading(false);
    }
  };

  return (
    <div className="split-container-root">
      <div className="split-container">
        {/* LADO IZQUIERDO: CARRUSEL DE IMÁGENES */}
        <div className="carousel-section">
          <div className="carousel-overlay" />

          {slides.map((slide, index) => (
            <img
              key={slide.src}
              src={slide.src}
              className={`carousel-slide ${slideIndex === index ? 'active' : ''}`}
              alt={slide.alt}
            />
          ))}

          <div className="info-content">
            <h1>Universidad Tecnológica de Coahuila</h1>
            <p>
              Plataforma integral de gestión, control de espacios y administración institucional segura.
            </p>
          </div>
        </div>

        {/* LADO DERECHO: FORMULARIO */}
        <div className="login-side">
          <form onSubmit={handleSubmit} className="login-box">
            <img src="/fondo/logo.png" alt="Logo" className="logo" />

            <div className="header-texts">
              <h2>Acceso</h2>
              <p>Ingresa tus credenciales institucionales</p>
            </div>

            {error && <div className="error-box">{error}</div>}

            <div className="form-group">
              <label htmlFor="usuario">Usuario</label>
              <input
                type="text"
                id="usuario"
                name="username"
                className="input"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Verificando acceso...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
