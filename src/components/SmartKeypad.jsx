import React from 'react';

export const SmartKeypad = ({ onKeyPress }) => {
  const symbols = ['/', '-', '*', '(', ')', ','];
  const verbs = ['AN', 'SS', 'NM', 'AP', 'TK', 'RF', 'ER', 'IG', 'FXP', 'TTP', 'RT', 'XE', 'HE'];

  return (
    <div className="smart-keypad">
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

      {verbs.map((verb) => (
        <button
          key={verb}
          className="keypad-btn verb-btn"
          onClick={() => onKeyPress(verb)}
          title={`Ejecutar ${verb}`}
        >
          {verb}
        </button>
      ))}
    </div>
  );
};
