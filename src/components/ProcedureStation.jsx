import React, { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, FileSearch, ShieldAlert } from 'lucide-react';
import { getDefinitionForProcedure } from '../lib/interactiveExercises';

const DEFAULT_EVIDENCE = [
  'Identifiqué el mercado, sistema y responsabilidad aplicables.',
  'Reuní los datos obligatorios del pasajero o del billete.',
  'Comprobé la condición bloqueante antes de cerrar el caso.',
  'Documenté la gestión y el resultado esperado.'
];

export function ProcedureStation({
  exerciseSession,
  pendingInterpretation,
  interpretationResult,
  onSubmitInterpretation,
  onContinueAfterInterpretation
}) {
  const procedure = exerciseSession?.procedure;
  const definition = pendingInterpretation || getDefinitionForProcedure(procedure);
  const [checked, setChecked] = useState([]);
  const evidence = useMemo(() => procedure?.requiredData || DEFAULT_EVIDENCE, [procedure]);
  const evidenceComplete = evidence.length === 0 || checked.length === evidence.length;

  const toggleEvidence = (index) => {
    setChecked((current) => current.includes(index)
      ? current.filter((item) => item !== index)
      : [...current, index]);
  };

  return (
    <div className="procedure-station" aria-label="Estación de procedimiento">
      <div className="procedure-station-head">
        <div>
          <span className="decision-kicker">ESTACIÓN ACTIVA · {exerciseSession?.station || 'MANUAL'}</span>
          <h2>{exerciseSession?.title || procedure?.titulo || 'Caso de procedimiento'}</h2>
        </div>
        <ShieldAlert size={20} aria-hidden="true" />
      </div>

      <section className="procedure-brief">
        <span className="procedure-label">CASO</span>
        <p>{exerciseSession?.description || procedure?.descripcion || 'Lee el procedimiento y reúne la evidencia antes de actuar.'}</p>
      </section>

      <section className="procedure-evidence">
        <div className="procedure-section-title"><FileSearch size={15} /> Evidencia que debes reunir</div>
        {evidence.map((item, index) => (
          <label key={index} className={`evidence-row ${checked.includes(index) ? 'checked' : ''}`}>
            <input type="checkbox" checked={checked.includes(index)} onChange={() => toggleEvidence(index)} />
            <span>{item}</span>
          </label>
        ))}
      </section>

      {definition && (
        <section className="procedure-decision">
          <div className="procedure-section-title"><ClipboardCheck size={15} /> Decide antes de cerrar</div>
          <h3>{definition.question}</h3>
          <div className="decision-options">
            {definition.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className="decision-option"
                disabled={interpretationResult?.correct}
                onClick={() => onSubmitInterpretation && onSubmitInterpretation(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {interpretationResult && (
            <div className={`interpretation-feedback ${interpretationResult.correct ? 'ok' : 'wrong'}`} role="status">
              <strong>{interpretationResult.correct ? 'Decisión correcta' : 'Revisa el procedimiento'}</strong>
              <span>{interpretationResult.feedback}</span>
              {interpretationResult.correct && (
                <button type="button" className="interpretation-continue" disabled={!evidenceComplete} onClick={onContinueAfterInterpretation}>
                  Marcar paso como comprendido
                </button>
              )}
              {interpretationResult.correct && !evidenceComplete && (
                <small className="procedure-evidence-required">Marca toda la evidencia antes de cerrar este paso.</small>
              )}
            </div>
          )}
        </section>
      )}

      <p className="procedure-station-note">
        Este caso no se ejecuta en la terminal Amadeus. Aquí practicas selección de procedimiento, datos obligatorios y evidencia.
      </p>
    </div>
  );
}
