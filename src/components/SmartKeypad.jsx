import React from 'react';
import { Delete, CornerDownLeft } from 'lucide-react';

export const SmartKeypad = ({ onKeyPress, onBackspace, onSubmit }) => {
  const symbols = ['/', '-', '*', '(', ')', ',', '.'];
  // Comandos del manual de clase primero, luego el resto del ciclo PNR.
  const verbs = [
    'DAN', 'DAC', 'FQC', 'SN', 'MN', 'MY', 'MO', 'AN', 'SS', 'NM',
    'FXX', 'FXP', 'FQN', 'MD', 'MU', 'DF', 'RM', 'AP', 'APE', 'SR',
    'TK', 'TKXL', 'RF', 'ER', 'RT', 'XE', 'TTP', 'HE'
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
          >
            {sym}
          </button>
        ))}

        <button
          className="keypad-btn space-btn"
          onClick={() => onKeyPress(' ')}
          title="Espacio"
        >
          ␣ ESP
        </button>

        <button
          className="keypad-btn"
          onClick={onBackspace}
          title="Borrar"
          aria-label="Borrar"
        >
          <Delete size={16} />
        </button>

        <button
          className="keypad-btn enter-btn"
          onClick={onSubmit}
          title="Enviar comando"
          aria-label="Enviar comando"
        >
          <CornerDownLeft size={16} /> ENVIAR
        </button>
      </div>

      {/* Fila 2: comandos (deslizable) */}
      <div className="keypad-row keypad-verbs">
        {verbs.map((verb) => (
          <button
            key={verb}
            className="keypad-btn verb-btn"
            onClick={() => onKeyPress(verb)}
            title={`Insertar ${verb}`}
          >
            {verb}
          </button>
        ))}
      </div>
    </div>
  );
};
