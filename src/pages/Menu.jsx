import React from 'react';
import { Link } from 'react-router-dom';
import { TerminalSquare, Brain, FileCheck } from 'lucide-react';

export function Menu() {
  return (
    <main className="main-layout" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '80vh' }}>
      <h2 style={{ marginBottom: '2.5rem', color: '#f8fafc', fontSize: '2.2rem', fontWeight: 'bold' }}>Elige tu entrenamiento</h2>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/simulador" style={{ textDecoration: 'none' }}>
          <div style={{ 
            background: 'rgba(30, 41, 59, 0.7)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '12px', 
            padding: '2.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            width: '260px',
            transition: 'transform 0.2s, background 0.2s',
            backdropFilter: 'blur(10px)'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(51, 65, 85, 0.9)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <TerminalSquare size={72} color="#38bdf8" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.5rem' }}>Ruta PNR guiada</h3>
            <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '0.95rem' }}>Avanza por 24 nodos, practica una misión diaria y usa el simulador Amadeus sin bloqueos.</p>
          </div>
        </Link>

        <Link to="/teoria" style={{ textDecoration: 'none' }}>
          <div style={{ 
            background: 'rgba(30, 41, 59, 0.7)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '12px', 
            padding: '2.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            width: '260px',
            transition: 'transform 0.2s, background 0.2s',
            backdropFilter: 'blur(10px)'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(51, 65, 85, 0.9)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Brain size={72} color="#a855f7" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.5rem' }}>Banco de Teoría</h3>
            <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '0.95rem' }}>Exámenes y quizzes sobre normativas y conocimiento de Iberia.</p>
          </div>
        </Link>

        <Link to="/examen-iberia" style={{ textDecoration: 'none' }}>
          <div style={{ 
            background: 'rgba(30, 41, 59, 0.7)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            borderRadius: '12px', 
            padding: '2.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            width: '260px',
            transition: 'transform 0.2s, background 0.2s',
            backdropFilter: 'blur(10px)'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <FileCheck size={72} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.5rem', textAlign: 'center' }}>Examen Oficial Iberia</h3>
            <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '0.95rem' }}>Simulación exacta de las 11 preguntas del examen oficial recuperado.</p>
          </div>
        </Link>
      </div>
    </main>
  );
}
