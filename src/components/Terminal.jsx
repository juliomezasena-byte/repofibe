import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { SmartKeypad } from './SmartKeypad';

export const Terminal = forwardRef(({ onExecuteCommand, history, hideVerbs = false, missionComplete = false }, ref) => {
  const screenRef = useRef(null);
  const inputRef = useRef(null);
  const [inputVal, setInputVal] = useState('');

  // Contrato P3.1: los chips escriben en el input via ref imperativa, sin
  // levantar inputVal a App (evita re-render de todo por keystroke).
  useImperativeHandle(ref, () => ({
    setInput: (text) => {
      setInputVal(text);
      if (inputRef.current) inputRef.current.focus();
    }
  }));

  // Hint de error en la capa UI (bajo la prompt, NUNCA en el scroll GDS).
  // Se muestra solo las primeras 3 veces para no volverse ruido.
  const [showTip, setShowTip] = useState(false);
  const seenRef = useRef(0);
  const last = history[history.length - 1];
  const lastErrorCmd = last && last.isError ? last.command : null;

  // Auto-scroll al final de la pantalla CRT
  useEffect(() => {
    if (screenRef.current) {
      screenRef.current.scrollTop = screenRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    if (history.length <= seenRef.current) return;
    seenRef.current = history.length;
    const item = history[history.length - 1];
    if (item && item.isError) {
      let n = 0;
      try { n = parseInt(localStorage.getItem('tipErrorCount') || '0', 10); } catch {}
      if (n < 3) {
        setShowTip(true);
        try { localStorage.setItem('tipErrorCount', String(n + 1)); } catch {}
      }
    } else {
      setShowTip(false);
    }
  }, [history]);

  const submitCommand = () => {
    if (!inputVal.trim()) return;
    onExecuteCommand(inputVal);
    setInputVal('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitCommand();
  };

  const handleInputChange = (val) => {
    setInputVal(val);
  };

  const handleKeypadPress = (text) => {
    setInputVal((prev) => prev + text);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleBackspace = () => {
    setInputVal((prev) => prev.slice(0, -1));
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="terminal-wrapper">
      {/* La victoria vive en el CHROME del emulador, nunca en el scroll GDS
          (Ley de Pantalla Limpia). El glow de 2s es puro CSS derivado del
          render — sin efectos ni entradas sinteticas en history. */}
      <div className={`terminal-header ${missionComplete ? 'mission-done' : ''}`}>
        <div>
          <span className="status-dot"></span>
          <span>AMADEUS 1A GDS<span className="hide-mobile"> TERMINAL (80 COLS)</span></span>
        </div>
        <div>
          {missionComplete
            ? 'MISION 100% ✓'
            : <>SESSION: ACTIVE<span className="hide-mobile"> (ONLINE)</span></>}
        </div>
      </div>

      <div className="terminal-screen" ref={screenRef}>
        <div className="output-block">
          <div className="response-text">
            A4Z9 - AMADEUS TRAINING SYSTEM - MEX1A0980{'\n'}
            SIGN IN COMPLETE - WORK AREA A
          </div>
        </div>

        {history.map((item, idx) => (
          <div key={idx} className="output-block">
            <div className="command-line-log">&gt; {item.command}</div>
            <div className={`response-text ${item.isError ? 'error-text' : ''}`}>
              {item.output}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="terminal-prompt-bar">
        <span className="prompt-symbol">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          className="cmd-input"
          value={inputVal}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="INGRESE COMANDO..."
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck="false"
        />
      </form>

      {showTip && lastErrorCmd && (
        <div className="terminal-tip">
          TIP: escribe <b>HE {(lastErrorCmd.match(/^[A-Za-z]+/) || [''])[0].toUpperCase()}</b> para ver la sintaxis del comando.
        </div>
      )}

      <SmartKeypad
        onKeyPress={handleKeypadPress}
        onBackspace={handleBackspace}
        onSubmit={submitCommand}
        hideVerbs={hideVerbs}
      />
    </div>
  );
});

Terminal.displayName = 'Terminal';
