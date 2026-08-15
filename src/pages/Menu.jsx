import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Phone, 
  Sparkles, 
  ArrowRight,
  Bot
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getProgressSummary } from '../lib/learningPath';

export function Menu() {
  const context = useAppContext() || {};
  const scenarios = context.scenarios || [];
  const learningProgress = context.learningProgress || {};

  // Cálculo de progreso verídico
  const progressSummary = useMemo(() => {
    return getProgressSummary(scenarios, learningProgress);
  }, [scenarios, learningProgress]);

  // Los escenarios se cargan por red. Hasta que llegan, `total` es 0 y el
  // progreso se leería como "0 / 24 (0%)" — indistinguible de no haber hecho
  // nada. Mientras no haya catálogo no se afirma un progreso que no sabemos.
  const catalogoListo = scenarios.length > 0;

  // Persistencia de notas reales de los exámenes
  const iberiaScore = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('cryptic-iberia-exam-v1') || 'null');
    } catch {
      return null;
    }
  }, []);

  const securityScore = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('cryptic-security-exam-v1') || 'null');
    } catch {
      return null;
    }
  }, []);

  const quizStats = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('cryptic-quiz-stats-v1') || '{}');
    } catch {
      return {};
    }
  }, []);

  return (
    <main className="menu-container">
      {/* Entrada principal: el estudiante comienza con un caso, no con un chatbot vacío. */}
      <section className="menu-hero-card">
        <div className="menu-hero-badge">
          <Sparkles size={14} /> MESA DE OPERACIONES · CASO ABIERTO
        </div>
        <div className="menu-hero-content">
          <div className="menu-hero-info">
            <div className="menu-hero-header">
              <div className="menu-hero-icon-wrapper">
                <Bot size={32} className="menu-hero-icon" />
              </div>
              <div>
                <h2 className="menu-hero-title">Practica un caso real</h2>
                <p className="menu-hero-subtitle">
                  Resuelve casos reales guiado paso a paso a través de 5 sistemas de aerolínea: Amadeus, Resiber, Natiba, Salesforce e IberiaNet.
                </p>
              </div>
            </div>
          </div>
          <Link to="/practicar" className="menu-hero-cta">
            <span>Elegir práctica</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Header de la sección de opciones */}
      <div className="menu-section-header">
        <h3 className="menu-section-title">Estaciones de Entrenamiento</h3>
        <p className="menu-section-subtitle">Selecciona una modalidad para poner a prueba tus conocimientos</p>
      </div>

      {/* Cuadrícula minimalista con Iconos 3D integrados sin cajas oscuras */}
      <div className="menu-grid-2x2">
        <Link to="/guia" className="menu-card menu-card-pnr">
          <div className="menu-card-header">
            {/* alt="" a propósito: el icono es decorativo y el título va justo
                al lado. Describirlo ("PNR 3D") solo añade ruido al lector. */}
            <img src="/images/card_pnr_v2.png" alt="" className="menu-card-3d-icon" />
            <span className="menu-card-tag tag-pnr">Simulador PNR</span>
          </div>
          <div>
            <h4 className="menu-card-title">Ruta PNR (Lecciones)</h4>
            <p className="menu-card-desc">
              Avanza por 24 lecciones guiadas con el simulador Amadeus, cumple tu misión diaria y desbloquea niveles.
            </p>
            <div className="menu-card-progress-bar">
              <div
                className="menu-card-progress-fill"
                style={{ width: catalogoListo ? `${progressSummary.percent}%` : '0%' }}
              ></div>
            </div>
            <span className="menu-card-progress-text">
              {catalogoListo
                ? `${progressSummary.completed} / ${progressSummary.total} lecciones (${progressSummary.percent}%)`
                : 'Cargando tu progreso…'}
            </span>
          </div>
        </Link>

        <Link to="/teoria" className="menu-card menu-card-teoria">
          <div className="menu-card-header">
            <img src="/images/card_theory_v2.png" alt="" className="menu-card-3d-icon" />
            <span className="menu-card-tag tag-teoria">Teoría</span>
          </div>
          <div>
            <h4 className="menu-card-title">Banco de Teoría GDS</h4>
            <p className="menu-card-desc">
              Quizzes interactivos de memorización de comandos, códigos IATA y conceptos clave de Amadeus.
            </p>
            <span className="menu-card-progress-text">Racha activa: {quizStats.streak || 0} Días</span>
          </div>
        </Link>

        <Link to="/examen-iberia" className="menu-card menu-card-iberia">
          <div className="menu-card-header">
            <img src="/images/card_iberia_v2.png" alt="" className="menu-card-3d-icon" />
            <span className="menu-card-tag tag-iberia">Oficial</span>
          </div>
          <div>
            <h4 className="menu-card-title">Examen Oficial Iberia</h4>
            <p className="menu-card-desc">
              Simulacro oficial de las 11 preguntas exactas del examen de certificación Iberia.
            </p>
            <span className="menu-card-progress-text">
              {iberiaScore ? `Puntaje previo: ${iberiaScore.score}/${iberiaScore.total}` : 'Estado: Sin realizar'}
            </span>
          </div>
        </Link>

        <Link to="/examen-seguridad" className="menu-card menu-card-seguridad">
          <div className="menu-card-header">
            <img src="/images/card_security_v2.png" alt="" className="menu-card-3d-icon" />
            <span className="menu-card-tag tag-seguridad">Filtro</span>
          </div>
          <div>
            <h4 className="menu-card-title">Examen Filtro de Seguridad</h4>
            <p className="menu-card-desc">
              Evaluación dedicada a autenticación de titulares, PNR, esperas y protocolo obligatorio.
            </p>
            <span className="menu-card-progress-text">
              {securityScore ? `Puntaje previo: ${securityScore.score}/${securityScore.total}` : 'Estado: Sin realizar'}
            </span>
          </div>
        </Link>

        <Link to="/roleplay" className="menu-card menu-card-roleplay menu-card-full">
          <div className="menu-card-horizontal">
            <img src="/images/card_roleplay_v2.png" alt="" className="menu-card-3d-icon" />
            <div className="menu-card-body">
              <div className="menu-card-title-row">
                <h4 className="menu-card-title">Simulación de Llamada (Roleplay)</h4>
                <span className="menu-card-tag tag-roleplay">Voz IA</span>
              </div>
              <p className="menu-card-desc">
                Atiende a un pasajero simulado por IA en tiempo real mientras resuelves su caso en el Terminal.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </main>
  );
}
