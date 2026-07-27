import React, { useState } from 'react';
import { TerminalSquare } from 'lucide-react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import '../styles/login.css';

export const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // App.jsx escuchará el estado y ocultará el login
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Correo o contraseña incorrectos.');
      } else {
        setError('Ocurrió un error al iniciar sesión.');
      }
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor, ingresa tu correo para restablecer la contraseña.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage('Te enviamos un correo para restablecer tu contraseña.');
      setError('');
    } catch (err) {
      setError('Error al enviar el correo. Verifica que tu correo esté bien escrito.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-left-bg"></div>
        
        <div className="login-brand">
          <TerminalSquare className="login-brand-icon" size={32} />
          <div>
            <h1>Cryptic Trainer</h1>
          </div>
        </div>

        <div className="login-hero-images">
          <img src="/assets/img/agent_icon.jpg" alt="Agente de viajes" className="login-hero-img" draggable="false" />
          <img src="/assets/img/globe_icon.jpg" alt="Globo terráqueo" className="login-hero-img secondary" draggable="false" />
          <img src="/assets/img/ticket_icon.jpg" alt="Ticket aéreo" className="login-hero-img tertiary" draggable="false" />
          <img src="/assets/img/suitcase_icon.jpg" alt="Maleta" className="login-hero-img quaternary" draggable="false" />
        </div>

        <div className="login-tagline">
          <h2>
            Enfoca tu talento,<br />
            <span className="highlight">domina el sistema.</span>
          </h2>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <h3>Bienvenido</h3>
          <p>Acceso Plataforma Educativa</p>

          <form className="login-form" onSubmit={handleLogin}>
            {error && <div className="error-message">{error}</div>}
            {resetMessage && <div className="success-message">{resetMessage}</div>}
            
            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input 
                type="email" 
                id="email" 
                placeholder="estudiante@agencia.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input 
                type="password" 
                id="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Entrando...' : 'Iniciar Sesión'}
            </button>
          </form>
          
          <button className="btn-outline" onClick={handleResetPassword} type="button">
            ¿Olvidaste tu contraseña? Restablecer
          </button>

          <div className="login-footer-text">
            Al iniciar sesión aceptas los <a href="#terminos">Términos</a> y el <a href="#privacidad">Tratamiento de Datos</a>.
          </div>
        </div>
      </div>
    </div>
  );
};
