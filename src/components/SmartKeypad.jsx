import React from 'react';
import { Delete, CornerDownLeft, CornerLeftDown } from 'lucide-react';

export const SmartKeypad = ({ onKeyPress, onBackspace, onSubmit, onNewline, hideVerbs = false, disabled = false }) => {
  const symbols = ['/', '-', '*', '(', ')', ',', '.'];
  // Comandos agrupados por capítulo del manual (mapa mental del flujo).
  const groups = [
    { label: 'IATA/MONEDA', verbs: ['DAN', 'DAC', 'FQC'] },
    { label: 'VUELOS', verbs: ['SN', 'AN', 'MN', 'MY', 'MO'] },
    { label: 'VENTA', verbs: ['SS', 'NM'] },
    { label: 'CONTACTOS', verbs: ['AP', 'APE'] },
    { label: 'SERVICIOS', verbs: ['SR', 'SRXBAG', 'OS'] },
    { label: 'EQUIPAJE/EMD', verbs: ['FXG', 'TQM', 'TMI', 'TTM'] },
    { label: 'TARIFAS', verbs: ['FXX', 'FXP', 'FQN', 'DF', 'TQT', 'MD', 'MU'] },
    { label: 'NOTAS', verbs: ['RM'] },
    { label: 'CIERRE', verbs: ['TK', 'TKXL', 'RF', 'ER', 'ERK', 'TTP'] },
    { label: 'PNR/AYUDA', verbs: ['RT', 'XE', 'HE'] }
  ];

  return (
    <div className="smart-keypad">
      {/* Fila 1: símbolos + acciones (siempre visibles) */}
      <div className="keypad-row keypad-actions">
        {symbols.map((sym) => (
          <button
            key={sym}
            className="keypad-btn"
            onClick={() => onKeyPress(sym)}
            title={`Insertar ${sym}`}
            aria-label={`Insertar ${sym}`}
            disabled={disabled}
          >
            {sym}
          </button>
        ))}

        <button
          className="keypad-btn space-btn"
          onClick={() => onKeyPress(' ')}
          title="Espacio"
          aria-label="Insertar espacio"
          disabled={disabled}
        >
          ␣ ESP
        </button>

        <button
          className="keypad-btn"
          onClick={onNewline}
          disabled={disabled}
          title="Nueva línea (bajar sin enviar)"
          aria-label="Nueva línea"
        >
          <CornerLeftDown size={16} />
        </button>

        <button
          className="keypad-btn"
          onClick={onBackspace}
          disabled={disabled}
          title="Borrar"
          aria-label="Borrar"
        >
          <Delete size={16} />
        </button>

        <button
          className="keypad-btn enter-btn"
          onClick={onSubmit}
          disabled={disabled}
          title="Enviar comando"
          aria-label="Enviar comando"
        >
          <CornerDownLeft size={16} /> ENVIAR
        </button>
      </div>

      {/* Fila 2: comandos agrupados (deslizable). En modo EXAMEN se oculta:
          es una chuleta de reconocimiento y el examen mide recuerdo. */}
      {!hideVerbs && (
      <div className="keypad-row keypad-verbs">
        {groups.map((g) => (
          <div key={g.label} className="keypad-group">
            <span className="keypad-group-label">{g.label}</span>
            <div className="keypad-group-btns">
              {g.verbs.map((verb) => (
                <button
                  key={verb}
                  className="keypad-btn verb-btn"
                  onClick={() => onKeyPress(verb)}
                  title={`Insertar ${verb}`}
                  aria-label={`Insertar ${verb}`}
                  disabled={disabled}
                >
                  {verb}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};
