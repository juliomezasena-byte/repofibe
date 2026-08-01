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
  // Se muestra siempre que el último comando falló — antes se apagaba
  // después de 3 veces por dispositivo y dejaba de ayudar justo cuando
  // más se necesitaba (queja real: "nadie lee las ayudas").
  const [showTip, setShowTip] = useState(false);
  const seenRef = useRef(0);
  const last = history[history.length - 1];
  const lastErrorCmd = last && last.isError ? last.command : null;

  // Estado para la animación de Shake
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (history.length === 0) return;
    const item = history[history.length - 1];
    if (item && item.isError) {
      setIsShaking(true);
    }
  }, [history]);

  // Auto-scroll al final de la pantalla CRT
  useEffect(() => {
    if (screenRef.current) {
      screenRef.current.scrollTop = screenRef.current.scrollHeight;
    }
  }, [history]);

  // Auto-crecer el textarea según su contenido (tope 140px, luego scroll).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [inputVal]);

  useEffect(() => {
    if (history.length <= seenRef.current) return;
    seenRef.current = history.length;
    const item = history[history.length - 1];
    if (item && item.isError) {
      setShowTip(true);
    } else {
      setShowTip(false);
    }
  }, [history]);

  // Enviar: cada línea no vacía se ejecuta como un comando en secuencia
  // (permite pegar/escribir un flujo entero y correrlo de una vez).
  const submitCommand = () => {
    if (!inputVal.trim()) return;
    const lineas = inputVal.split('\n').map((l) => l.trim()).filter(Boolean);
    lineas.forEach((linea) => onExecuteCommand(linea));
    setInputVal('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitCommand();
  };

  // Enter = enviar · Shift+Enter = nueva línea (espaciar hacia abajo).
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitCommand();
    }
  };

  const handleInputChange = (val) => {
    setInputVal(val);
  };

  const handleNewline = () => {
    setInputVal((prev) => prev + '\n');
    if (inputRef.current) inputRef.current.focus();
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
    <div className="terminal-wrapper" style={{ overflowX: 'hidden' }}>
      <div 
        className={`terminal-inner ${isShaking ? 'terminal-shake' : ''}`} 
        onAnimationEnd={() => setIsShaking(false)}
        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
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
        <textarea
          ref={inputRef}
          rows={1}
          className="cmd-input"
          value={inputVal}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="INGRESE COMANDO...  (Enter = enviar · Shift+Enter = nueva línea)"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck="false"
        />
      </form>

      {showTip && lastErrorCmd && (
        <div className={`terminal-tip ${last?.hint ? 'hint-reactivo' : ''}`} data-testid="reactive-hint">
          {last?.hint ? (
            <>✧ <b>Pista:</b> {last.hint}</>
          ) : (
            <>TIP: escribe <b>HE {(lastErrorCmd.match(/^[A-Za-z]+/) || [''])[0].toUpperCase()}</b> para ver la sintaxis del comando.</>
          )}
        </div>
      )}

      <SmartKeypad
        onKeyPress={handleKeypadPress}
        onBackspace={handleBackspace}
        onSubmit={submitCommand}
        onNewline={handleNewline}
        hideVerbs={hideVerbs}
      />
      </div>
    </div>
  );
});

Terminal.displayName = 'Terminal';
