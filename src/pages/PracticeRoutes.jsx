import React, { useEffect, useMemo, useRef } from 'react';
import { ArrowRight, BookOpen, Brain, CheckCircle2, ClipboardList, Headphones, MessageCircle, Play, Route as RouteIcon, ShieldCheck, TerminalSquare } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { getExercisesByCategory, getExerciseById } from '../lib/procedureExercises';
import { Simulator } from './Simulator';
import { Tutor } from './Tutor';

const MODES = [
  {
    id: 'guided',
    title: 'Ruta guiada',
    description: 'Una misión corta: entiendes el caso, eliges el primer procedimiento y ejecutas paso a paso.',
    meta: '24 lecciones',
    to: '/ejercicios',
    icon: RouteIcon,
    tone: 'practice-route'
  },
  {
    id: 'manuals',
    title: 'Procedimiento del manual',
    description: 'Busca comidas, facturas, cambios, EMD, pasajeros especiales y otros procedimientos.',
    meta: 'Catálogo por tema',
    to: '/manuales',
    icon: ClipboardList,
    tone: 'practice-manuals'
  },
  {
    id: 'free',
    title: 'Terminal libre',
    description: 'Practica comandos Amadeus sin una misión impuesta. Ideal para repetir una operación.',
    meta: 'Sin bloqueo pedagógico',
    to: '/simulador/libre',
    icon: TerminalSquare,
    tone: 'practice-free'
  },
  {
    id: 'coach',
    title: 'Tutor de casos',
    description: 'Escribe el caso, pega el billete o pregunta por un paso. El tutor conserva el contexto.',
    meta: 'Modo libre o guiado',
    to: '/tutor/libre',
    icon: MessageCircle,
    tone: 'practice-coach'
  }
];

const SECONDARY = [
  { title: 'Teoría GDS', description: 'Memoriza comandos y conceptos.', to: '/teoria', icon: Brain },
  { title: 'Examen Iberia', description: 'Practica la certificación.', to: '/examen/iberia', icon: CheckCircle2 },
  { title: 'Filtro de seguridad', description: 'Revisa el protocolo obligatorio.', to: '/examen/seguridad', icon: ShieldCheck },
  { title: 'Roleplay de llamada', description: 'Atiende a un pasajero simulado.', to: '/roleplay', icon: Headphones }
];

export function PracticeHub() {
  return (
    <main className="practice-hub" aria-labelledby="practice-hub-title">
      <section className="practice-hub-hero">
        <div>
          <span className="practice-kicker"><Play size={14} /> CENTRO DE PRÁCTICA</span>
          <h1 id="practice-hub-title">¿Qué quieres practicar hoy?</h1>
          <p>Elige una ruta. Todos los caminos terminan en una actividad concreta y te dicen qué hacer después.</p>
        </div>
        <Link className="practice-hub-back" to="/">Volver al inicio</Link>
      </section>

      <section className="practice-flow-strip" aria-label="Flujo de aprendizaje">
        <span><strong>1</strong> Elige</span><ArrowRight size={14} />
        <span><strong>2</strong> Entiende</span><ArrowRight size={14} />
        <span><strong>3</strong> Ejecuta</span><ArrowRight size={14} />
        <span><strong>4</strong> Verifica</span>
      </section>

      <section aria-labelledby="practice-modes-title">
        <div className="practice-section-heading">
          <div><span className="practice-kicker">CAMINO PRINCIPAL</span><h2 id="practice-modes-title">Empieza por una modalidad</h2></div>
          <span className="practice-section-note">Recomendado: Ruta guiada</span>
        </div>
        <div className="practice-mode-grid">
          {MODES.map(({ id, title, description, meta, to, icon: Icon, tone }) => (
            <Link key={id} to={to} className={`practice-mode-card ${tone}`}>
              <span className="practice-mode-icon"><Icon size={22} /></span>
              <div className="practice-mode-copy"><span className="practice-mode-meta">{meta}</span><h3>{title}</h3><p>{description}</p></div>
              <ArrowRight className="practice-mode-arrow" size={18} />
            </Link>
          ))}
        </div>
      </section>

      <section className="practice-secondary" aria-labelledby="practice-secondary-title">
        <div className="practice-section-heading"><div><span className="practice-kicker">COMPLEMENTOS</span><h2 id="practice-secondary-title">Repasa o evalúate</h2></div></div>
        <div className="practice-secondary-grid">
          {SECONDARY.map(({ title, description, to, icon: Icon }) => <Link key={to} to={to} className="practice-secondary-card"><Icon size={17} /><span><strong>{title}</strong><small>{description}</small></span><ArrowRight size={15} /></Link>)}
        </div>
      </section>
    </main>
  );
}

export function ManualCatalog() {
  const navigate = useNavigate();
  const categories = useMemo(() => Object.values(getExercisesByCategory()), []);

  const abrir = (exercise) => {
    navigate(`/manuales/${exercise.id}`);
  };

  return (
    <main className="manual-catalog" aria-labelledby="manual-catalog-title">
      <header className="manual-catalog-header">
        <div><span className="practice-kicker"><BookOpen size={14} /> BIBLIOTECA OPERATIVA</span><h1 id="manual-catalog-title">Elige un procedimiento para practicar</h1><p>Selecciona el caso. Te mostraremos el manual, la evidencia que necesitas y el siguiente paso.</p></div>
        <Link className="practice-hub-back" to="/practicar">Cambiar modalidad</Link>
      </header>
      <div className="manual-flow-note"><strong>Flujo:</strong> selecciona un procedimiento → lee el objetivo → reúne la evidencia → completa el paso → recibe feedback.</div>
      <div className="manual-category-list">
        {categories.map((category) => <section key={category.id} className="manual-category" aria-labelledby={`manual-category-${category.id}`}>
          <div className="manual-category-heading"><h2 id={`manual-category-${category.id}`}>{category.nombre}</h2><span>{category.ejercicios.length} ejercicios</span></div>
          <div className="manual-exercise-grid">
            {category.ejercicios.map((exercise) => <button key={exercise.id} type="button" className="manual-exercise-card" onClick={() => abrir(exercise)}>
              <span className="manual-exercise-topline"><span>{exercise.dificultad}</span><small>{exercise.duracionMin} min</small></span>
              <strong>{exercise.titulo}</strong><p>{exercise.descripcion}</p><span className="manual-exercise-action">Practicar <ArrowRight size={15} /></span>
            </button>)}
          </div>
        </section>)}
      </div>
    </main>
  );
}

export function ScenarioRoute() {
  const { scenarioId } = useParams();
  const { scenarios = [], handleSelectScenario } = useAppContext();
  const loaded = useRef(null);
  const [resolvedId, setResolvedId] = React.useState(null);
  const loading = scenarios.length === 0;
  const scenario = scenarios.find((item) => item.id === scenarioId);
  useEffect(() => {
    if (scenario && loaded.current !== scenarioId) {
      loaded.current = scenarioId;
      handleSelectScenario(scenarioId);
      setResolvedId(scenarioId);
    }
  }, [scenario, scenarioId, handleSelectScenario]);
  if (loading) return <RouteLoading label="Cargando el ejercicio guiado…" />;
  if (!scenario) return <RouteNotFound type="escenario" backTo="/ejercicios" />;
  if (resolvedId !== scenarioId) return <RouteLoading label="Preparando la estación del ejercicio…" />;
  return <Simulator />;
}

export function ProcedureRoute() {
  const { procedureId } = useParams();
  const { handleStartProcedureExercise } = useAppContext();
  const loaded = useRef(null);
  const [resolvedId, setResolvedId] = React.useState(null);
  const procedure = useMemo(() => getExerciseById(procedureId), [procedureId]);
  useEffect(() => {
    if (!procedure) return;
    if (loaded.current !== procedure.id) {
      loaded.current = procedure.id;
      handleStartProcedureExercise?.(procedure);
      setResolvedId(procedure.id);
    }
  }, [procedure, handleStartProcedureExercise]);
  if (!procedure) return <RouteNotFound type="procedimiento" backTo="/manuales" />;
  if (resolvedId !== procedure.id) return <RouteLoading label="Preparando la estación del procedimiento…" />;
  return <Simulator />;
}

export function TutorRoute({ mode = 'guided' }) {
  return <Tutor mode={mode} />;
}

export function RouteLoading({ label = 'Cargando…' }) {
  return (
    <main className="route-state route-state-loading" role="status" aria-live="polite">
      <span className="practice-kicker">PREPARANDO LA PRÁCTICA</span>
      <h1>{label}</h1>
      <p>Estamos cargando el caso y su estación. Todavía no ejecutes comandos.</p>
    </main>
  );
}

export function RouteNotFound({ type, backTo }) {
  return (
    <main className="route-state route-state-error" role="alert">
      <span className="practice-kicker">EJERCICIO NO ENCONTRADO</span>
      <h1>Este {type} no existe o ya no está disponible.</h1>
      <p>Elige otro ejercicio para continuar con una sesión válida.</p>
      <Link className="practice-primary-action" to={backTo}>Volver al catálogo <ArrowRight size={16} /></Link>
    </main>
  );
}
