import React, { useState, useRef, useEffect } from 'react';
import { SmartKeypad } from './SmartKeypad';

export const Terminal = ({ onExecuteCommand, history }) => {
  const screenRef = useRef(null);
  const inputRef = useRef(null);
  const [inputVal, setInputVal] = useState('');

  // Auto-scroll al final de la pantalla CRT
  useEffect(() => {
    if (screenRef.current) {
      screenRef.current.scrollTop = screenRef.current.scrollHeight;
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
      <div className="terminal-header">
        <div>
          <span className="status-dot"></span>
          <span>AMADEUS 1A GDS<span className="hide-mobile"> TERMINAL (80 COLS)</span></span>
        </div>
        <div>SESSION: ACTIVE<span className="hide-mobile"> (ONLINE)</span></div>
      </div>

      <div className="terminal-screen" ref={screenRef}>
        <div className="output-block">
          <div className="response-text">
            *** CRYPTIC TRAINER GDS SYSTEM READY ***{'\n'}
            PROFILE: AMADEUS (DSL ENGINE 1.2){'\n'}
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
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="INGRESE COMANDO..."
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck="false"
        />
      </form>

      <SmartKeypad
        onKeyPress={handleKeypadPress}
        onBackspace={handleBackspace}
        onSubmit={submitCommand}
      />
    </div>
  );
};
