import React, { useState, useRef, useEffect } from 'react';
import { SmartKeypad } from './SmartKeypad';

export const Terminal = ({ onExecuteCommand, history }) => {
  const [inputVal, setInputVal] = useState('');
  const screenRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll al final de la pantalla CRT
  useEffect(() => {
    if (screenRef.current) {
      screenRef.current.scrollTop = screenRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    onExecuteCommand(inputVal);
    setInputVal('');
  };

  const handleKeypadPress = (text) => {
    setInputVal((prev) => prev + text);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="terminal-wrapper">
      <div className="terminal-header">
        <div>
          <span className="status-dot"></span>
          <span>AMADEUS 1A GDS TERMINAL (80 COLS)</span>
        </div>
        <div>SESSION: ACTIVE (ONLINE)</div>
      </div>

      <div className="terminal-screen" ref={screenRef}>
        <div className="output-block">
          <div className="response-text">
            *** CRYPTIC TRAINER GDS SYSTEM READY ***{'\n'}
            PROFILE: AMADEUS (DSL ENGINE 1.0){'\n'}
            TYPE 'HE' FOR HELP MANUAL OR SELECT A TRAIN SCENARIO.
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
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="INGRESE COMANDO (EJ: AN25NOVBOGMIA)..."
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck="false"
        />
      </form>

      <SmartKeypad onKeyPress={handleKeypadPress} />
    </div>
  );
};
