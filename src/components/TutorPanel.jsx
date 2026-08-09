import React, { useState, useRef } from 'react';
import { Bot, HelpCircle, ClipboardPaste, CheckCircle2, XCircle, AlertTriangle, ArrowRightLeft, Loader2, FileText, BookOpen, Sparkles, ChevronRight } from 'lucide-react';
import { pedirPaso } from '../lib/tutorClient';
import { PROCEDURE_EXERCISES, PROCEDURE_CATEGORIES, getExercisesByCategory } from '../lib/procedureExercises';
import { useAppContext } from '../context/AppContext';

const SISTEMAS = {
  amadeus: { nombre: 'Amadeus', clase: 'tut-sis-amadeus' },
  resiber: { nombre: 'Resiber', clase: 'tut-sis-resiber' },
  natiba: { nombre: 'Filtro Natiba (Web)', clase: 'tut-sis-natiba' },
  salesforce: { nombre: 'Salesforce', clase: 'tut-sis-salesforce' },
  iberianet: { nombre: 'IberiaNet', clase: 'tut-sis-iberianet' }
};

const CONFIANZA = {
  verbatim: { texto: 'del manual', clase: 'tut-conf-verbatim' },
  derivado: { texto: 'deducido', clase: 'tut-conf-derivado' },
  hueco: { texto: 'sin documentar', clase: 'tut-conf-hueco' }
};

export function TutorPanel() {
  const { pnrFsm } = useAppContext ? useAppContext() || {} : {};
  const [caso, setCaso] = useState({ intencion: null });
  const [respuestas, setRespuestas] = useState({});
  const [estado, setEstado] = useState(null);
  const [comando, setComando] = useState('');
  const [pantalla, setPantalla] = useState('');
  const [ejercicioActivo, setEjercicioActivo] = useState(null);
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
  // Las pantallas pegadas se GUARDAN y se reenvían en cada petición. Si no,
  // el árbol olvidaba el billete en cuanto contestabas la siguiente pregunta.
  const [pantallas, setPantallas] = useState([]);
  const [mostrarPegar, setMostrarPegar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [revelado, setRevelado] = useState(false);
  const tutorMode = (() => {
    try {
      return localStorage.getItem('cryptic-tutor-mode-v1') || 'ciegas';
    } catch {
      return 'ciegas';
    }
  })();
  // Contador de peticiones: descarta explicaciones que lleguen tarde.
  const peticionRef = useRef(0);

  const paso = estado?.paso;
  const pregunta = estado?.decision?.siguientePregunta;
  const sistema = SISTEMAS[paso?.sistema] || null;
  const confianza = CONFIANZA[paso?.confianza] || null;

  const catalogByCat = getExercisesByCategory();

  const iniciarEjercicio = (ejercicio) => {
    setEjercicioActivo(ejercicio);
    setMostrarCatalogo(false);

    if (ejercicio.seedPnr && pnrFsm) {
      pnrFsm.setState({
        ...pnrFsm.getState(),
        passengers: ejercicio.seedPnr.passengers || [],
        segments: ejercicio.seedPnr.segments || [],
        contacts: ejercicio.seedPnr.contacts || [],
        ticketing: ejercicio.seedPnr.ticketing || null,
        issuedTicket: ejercicio.seedPnr.issuedTicket || null,
        isTicketed: !!ejercicio.seedPnr.isTicketed,
        tsm: ejercicio.seedPnr.tsm || null,
        tsmIssued: !!ejercicio.seedPnr.tsmIssued
      });
    }

    avanzar({ procedimientoId: ejercicio.procedimientoId, reiniciar: true });
  };

  async function avanzar(extra = {}) {
    setRevelado(false);
    setCargando(true);
    setError(null);
    try {
      const nuevasRespuestas = { ...respuestas, ...(extra.respuestas || {}) };
      setRespuestas(nuevasRespuestas);

      const nuevasPantallas = extra.pantallaNueva
        ? [...pantallas, extra.pantallaNueva]
        : pantallas;
      if (extra.pantallaNueva) setPantallas(nuevasPantallas);

      const peticion = {
        procedimientoId: extra.procedimientoId ?? estado?.procedimientoId,
        caso: { ...caso, ...(extra.caso || {}), respuestas: nuevasRespuestas, pantallas: nuevasPantallas },
        pasoActual: extra.reiniciar ? null : (paso?.n ?? null),
        comandoEscrito: extra.comandoEscrito ?? null,
        datos: extra.datos || {},
        nivel: 'principiante'
      };

      // Fase 1: lo determinista. Llega enseguida porque no espera al modelo.
      const datos = await pedirPaso({ ...peticion, conIA: false });
      setEstado(datos);
      if (extra.comandoEscrito) setComando('');

      // Fase 2: la redacción. Se pide en segundo plano y se pega encima
      // cuando llega. Un id de petición evita que una explicación tardía
      // caiga sobre un paso que ya cambió.
      if (datos.pendienteDeExplicacion) {
        const miPeticion = ++peticionRef.current;
        pedirPaso({ ...peticion, conIA: true })
          .then((conTexto) => {
            if (miPeticion !== peticionRef.current) return;
            setEstado((previo) =>
              previo && previo.paso?.n === conTexto.paso?.n
                ? { ...previo, explicacion: conTexto.explicacion, diagnostico: conTexto.diagnostico, pendienteDeExplicacion: false }
                : previo
            );
          })
          .catch(() => {
            // La explicación es un adorno: si falla, el paso del manual sigue.
            if (miPeticion !== peticionRef.current) return;
            setEstado((previo) => (previo ? { ...previo, pendienteDeExplicacion: false } : previo));
          });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  function responder(id, valor) {
    if (id === 'intencion') {
      setCaso({ intencion: valor });
      avanzar({ caso: { intencion: valor }, reiniciar: true });
      return;
    }
    avanzar({ respuestas: { [id]: valor } });
  }

  function reiniciar() {
    setCaso({ intencion: null });
    setRespuestas({});
    setEstado(null);
    setComando('');
    setPantalla('');
    setPantallas([]);
    setMostrarPegar(false);
    setError(null);
  }

  return (
    <aside className="sidebar-panel tutor-panel" aria-live="polite">
      <h2 className="panel-title">
        <Bot size={18} /> Tutor
      </h2>

      {/* Dónde estás */}
      {estado?.titulo && (
        <div className="tut-cabecera">
          <span className="tut-procedimiento">{estado.titulo}</span>
          <button type="button" className="tut-reiniciar" onClick={reiniciar}>Empezar de nuevo</button>
        </div>
      )}

      {/* El camino recorrido: cómo hemos llegado aquí */}
      {estado?.decision?.camino?.length > 0 && (
        <ol className="tut-camino">
          {estado.decision.camino.map((c, i) => (
            <li key={i}>
              <span className="tut-camino-preg">{c.pregunta}</span>
              <strong>{c.respuesta}</strong>
              <em>{c.comoLoSe}</em>
            </li>
          ))}
        </ol>
      )}

      {/* El árbol necesita saber algo antes de decidir */}
      {pregunta && (
        <div className="tut-pregunta">
          <p className="tut-pregunta-texto">{pregunta.texto}</p>
          {pregunta.porQueImporta && <p className="tut-pregunta-porque">{pregunta.porQueImporta}</p>}
          {pregunta.opciones && (
            <div className="tut-opciones">
              {pregunta.opciones.map((o) => (
                <button
                  key={String(o.valor)}
                  type="button"
                  className="quiz-big-btn"
                  disabled={cargando}
                  onClick={() => responder(pregunta.id, o.valor)}
                >
                  {o.texto}
                </button>
              ))}
            </div>
          )}
          {!pregunta.opciones && (
            <button type="button" className="quiz-big-btn" onClick={() => setMostrarPegar(true)}>
              <ClipboardPaste size={16} /> Pegar la pantalla
            </button>
          )}
        </div>
      )}

      {/* Botón superior para cambiar de ejercicio en cualquier momento */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--color-tutor)" />
          <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-light)' }}>
            {ejercicioActivo ? `Ejercicio: ${ejercicioActivo.titulo}` : 'Tutor IA por Procedimiento'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMostrarCatalogo(!mostrarCatalogo)}
          className="interactive-surface"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--color-tutor)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <BookOpen size={13} />
          {mostrarCatalogo ? 'Cerrar Catálogo' : 'Elegir Ejercicio'}
        </button>
      </div>

      {/* Catálogo Completo de Ejercicios Guiados por Procedimiento */}
      {(!estado || mostrarCatalogo) && !cargando && (
        <div className="tut-catalogo-ejercicios" style={{ background: 'var(--bg-dark)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', padding: '14px', marginBottom: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={16} color="var(--color-tutor)" /> Catálogo de Ejercicios por Procedimiento
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              Elige cualquier procedimiento de Iberia/Amadeus para cargarlo con su PNR semilla y practicarlo paso a paso:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {Object.values(catalogByCat).map((cat) => (
              <div key={cat.id} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-light)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{cat.nombre}</span>
                  <span style={{ fontSize: '11px', background: 'var(--bg-dark)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    {cat.ejercicios.length} ejercicios
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                  {cat.ejercicios.map((ej) => (
                    <button
                      key={ej.id}
                      type="button"
                      className="interactive-surface"
                      onClick={() => iniciarEjercicio(ej)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        padding: '8px 10px',
                        textAlign: 'left'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--text-light)' }}>{ej.titulo}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{ej.descripcion}</div>
                      </div>
                      <ChevronRight size={16} color="var(--color-tutor)" style={{ flexShrink: 0, marginLeft: '8px' }} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lo que el tutor ha leído de verdad. Sin este acuse de recibo, pegar
          una pantalla parecía no hacer nada. */}
      {estado?.lectura?.tipo === 'billete' && (
        <div className="tut-leido">
          <FileText size={14} />
          <span>
            Billete leído: <strong>{estado.lectura.billete.familia || 'familia sin identificar'}</strong>
            {estado.lectura.billete.placa && ` · placa ${estado.lectura.billete.placa}`}
            {estado.lectura.billete.doi && ` · DOI ${estado.lectura.billete.doi}`}
            {' · '}
            {estado.lectura.billete.algunSegmentoVolado ? 'hay tramos volados' : 'nada volado'}
          </span>
        </div>
      )}
      {estado?.lectura?.tipo === 'pnr' && (
        <div className="tut-leido">
          <FileText size={14} />
          <span>
            PNR leído: <strong>{estado.lectura.pnr.localizador || 'sin localizador'}</strong>
            {` · ${estado.lectura.pnr.pasajeros?.length || 0} pasajero(s) · ${estado.lectura.pnr.segmentos?.length || 0} segmento(s)`}
          </span>
        </div>
      )}
      {estado?.lectura?.tipo === 'historico' && (
        <div className="tut-leido">
          <FileText size={14} />
          <span>
            Histórico leído: <strong>{estado.lectura.historico.entradas?.length || 0} entrada(s)</strong>
            {` · ${estado.lectura.historico.cancelaciones?.length || 0} cancelación(es) · ${estado.lectura.historico.cambiosDeHora?.length || 0} cambio(s) de hora`}
          </span>
        </div>
      )}
      {estado?.lectura && !estado.lectura.tipo && (
        <p className="tut-advertencia"><AlertTriangle size={13} /> {estado.lectura.avisos?.[0]}</p>
      )}

      {/* Caja para pegar una pantalla real */}
      {mostrarPegar && (
        <div className="tut-pegar">
          <label htmlFor="tut-pantalla">Pega aquí la salida del terminal</label>
          <textarea
            id="tut-pantalla"
            rows={6}
            value={pantalla}
            onChange={(e) => setPantalla(e.target.value)}
            placeholder="DTR:TN 075-…   ·   RT   ·   RHA"
          />
          <button
            type="button"
            className="quiz-big-btn"
            disabled={!pantalla.trim() || cargando}
            onClick={() => { avanzar({ pantallaNueva: pantalla }); setPantalla(''); setMostrarPegar(false); }}
          >
            Leerla
          </button>
        </div>
      )}

      {/* Pegar una pantalla tiene que estar SIEMPRE a mano: el billete ahorra
          tres preguntas y el alumno no tiene por qué saber cuándo ofrecerlo. */}
      {estado && !mostrarPegar && !estado.terminado && (
        <button type="button" className="tut-pegar-abrir" onClick={() => setMostrarPegar(true)}>
          <ClipboardPaste size={14} /> Pegar una pantalla{pantallas.length ? ` (${pantallas.length} leída${pantallas.length > 1 ? 's' : ''})` : ''}
        </button>
      )}

      {/* El salto entre sistemas: el paso invisible */}
      {estado?.saltoDeSistema && (
        <div className="tut-salto">
          <ArrowRightLeft size={16} />
          <span>
            Cambias de <strong>{SISTEMAS[estado.saltoDeSistema.de]?.nombre}</strong> a{' '}
            <strong>{SISTEMAS[estado.saltoDeSistema.a]?.nombre}</strong>
          </span>
        </div>
      )}

      {/* El paso */}
      {paso && (
        <div className="tut-paso">
          <div className="tut-paso-badges">
            {sistema && <span className={`tut-badge ${sistema.clase}`}>{sistema.nombre}</span>}
            {confianza && <span className={`tut-badge ${confianza.clase}`}>{confianza.texto}</span>}
            {paso.opcional && <span className="tut-badge tut-conf-derivado">opcional</span>}
            {paso.esBloqueante && <span className="tut-badge tut-bloqueante">bloqueante</span>}
          </div>

          <p className="tut-paso-proceso">
            <span className="tut-paso-n">Paso {paso.n}</span> {paso.proceso}
          </p>

          {paso.comando ? (
            tutorMode === 'ciegas' && !revelado && !estado?.veredicto?.correcto ? (
              <div className="tut-comando-enmascarado" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a', padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', margin: '8px 0' }}>
                <code style={{ color: '#38bdf8', letterSpacing: '4px', fontSize: '15px' }}>••••••••••••</code>
                <button
                  type="button"
                  onClick={() => setRevelado(true)}
                  style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  👁️ Revelar Respuesta
                </button>
              </div>
            ) : (
              <code className="tut-comando">{paso.comando}</code>
            )
          ) : (
            <p className="tut-sin-comando">
              {paso.confianza === 'hueco'
                ? 'Este paso NO está en el material. Pregúntaselo a tu instructor: no te lo inventes.'
                : 'Este paso no lleva comando.'}
            </p>
          )}

          {paso.nota && <p className="tut-nota"><AlertTriangle size={13} /> {paso.nota}</p>}
          {estado.explicacion && <p className="tut-explicacion">{estado.explicacion}</p>}
          {estado.pendienteDeExplicacion && (
            <p className="tut-redactando">
              <Loader2 size={12} className="tut-girando" /> ampliando la explicación…
            </p>
          )}
        </div>
      )}

      {/* Veredicto de lo que escribiste (4 niveles) - Solo se muestra si NO hay avisos de formulario pendiente */}
      {estado?.veredicto && !(estado?.avisos && estado.avisos.some(a => a.startsWith('Faltan datos'))) && (
        <div className={`tut-veredicto ${estado.veredicto.correcto ? 'tut-ok' : estado.veredicto.parcial ? 'tut-parcial' : 'tut-mal'}`}>
          {estado.veredicto.correcto ? (
            <><CheckCircle2 size={16} /> Correcto</>
          ) : estado.veredicto.parcial ? (
            <><AlertTriangle size={16} /> Transacción correcta ({estado.veredicto.esperado?.split(' ')[0] || ''}). Revisa los parámetros.</>
          ) : (
            <><XCircle size={16} /> {estado.veredicto.motivo}</>
          )}
          {estado.veredicto.pista && <span className="tut-pista">{estado.veredicto.pista}</span>}
          {estado.diagnostico && <span className="tut-pista">{estado.diagnostico}</span>}
        </div>
      )}

      {/* Avisos y advertencias del árbol */}
      {estado?.decision?.advertencias?.map((a, i) => (
        <p key={`adv-${i}`} className="tut-advertencia"><AlertTriangle size={13} /> {a}</p>
      ))}
      {(estado?.avisos || []).concat(estado?.decision?.avisos || []).map((a, i) => (
        <p key={`av-${i}`} className="tut-aviso">{a}</p>
      ))}

      {/* Escribir el comando */}
      {paso?.comando && !estado?.terminado && (
        <form
          className="tut-form"
          onSubmit={(e) => { e.preventDefault(); if (comando.trim()) avanzar({ comandoEscrito: comando }); }}
        >
          <input
            type="text"
            value={comando}
            onChange={(e) => setComando(e.target.value)}
            placeholder="Escribe el comando para comprobar (ej: FXP, DTR:...)"
            disabled={cargando}
            aria-label="Comando para el tutor"
          />
          <button type="submit" className="quiz-big-btn" disabled={!comando.trim() || cargando}>
            Comprobar
          </button>
        </form>
      )}

      {/* Botón de avance para pasos de consulta / informativos que no llevan comando de terminal */}
      {!paso?.comando && !estado?.terminado && (
        <button
          type="button"
          className="quiz-big-btn interactive-surface"
          disabled={cargando}
          onClick={() => avanzar({})}
          style={{
            width: '100%',
            marginTop: '12px',
            background: 'var(--color-tutor)',
            color: 'var(--bg-terminal)',
            fontWeight: '700',
            padding: '12px 14px',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '13px'
          }}
        >
          <CheckCircle2 size={16} /> Entendido / Paso hecho — Continuar
        </button>
      )}

      {/* El botón que siempre está */}
      {estado && !estado.terminado && (
        <button type="button" className="tut-ayuda" disabled={cargando} onClick={() => avanzar({})}>
          <HelpCircle size={15} /> ¿Y ahora qué hago?
        </button>
      )}

      {estado?.terminado && (
        <p className="tut-terminado"><CheckCircle2 size={16} /> Procedimiento completado.</p>
      )}

      {cargando && <p className="tut-cargando"><Loader2 size={14} className="tut-girando" /> Pensando…</p>}
      {error && <p className="tut-error">{error}</p>}
    </aside>
  );
}
