import React from 'react';
import { Sparkles, Info } from 'lucide-react';

export const VisualHelper = ({ currentInput, dslParser }) => {
  if (!currentInput || !currentInput.trim()) {
    return (
      <div className="visual-helper-bar">
        <div className="helper-title">
          <Sparkles size={16} />
          <span>Asistente Estudiante (Modo Guiado Activo)</span>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Ingresa un comando (ej: <code style={{ color: 'var(--primary-cyan)' }}>AN25NOVBOGMIA</code>, <code style={{ color: 'var(--primary-cyan)' }}>DAN LIMA</code> o <code style={{ color: 'var(--primary-cyan)' }}>FQC35USD/COP</code>) para ver su desglose interactivo.
        </div>
      </div>
    );
  }

  const parseResult = dslParser ? dslParser.parse(currentInput) : null;

  return (
    <div className="visual-helper-bar">
      <div className="helper-title">
        <Info size={16} />
        <span>Desglose de Sintaxis: {parseResult?.code || 'COMANDO GDS'}</span>
      </div>

      {parseResult && parseResult.success ? (
        <div className="helper-tokens">
          <div className="token-chip">
            <span className="token-val">{parseResult.code}</span>
            <span className="token-label">{parseResult.commandSpec?.name || 'Comando'}</span>
          </div>

          {Object.entries(parseResult.params || {}).map(([key, val]) => (
            <div key={key} className="token-chip">
              <span className="token-val">{val}</span>
              <span className="token-label">
                {key === 'date' ? 'Fecha de Viaje' :
                 key === 'origin' ? 'Origen (IATA)' :
                 key === 'destination' ? 'Destino (IATA)' :
                 key === 'count' ? 'Asientos' :
                 key === 'class' ? 'Clase/Cabina' :
                 key === 'line' ? 'Opción Vuelo' :
                 key === 'surname' ? 'Apellido' :
                 key === 'firstname' ? 'Nombre' :
                 key === 'cityName' ? 'Nombre Ciudad' :
                 key === 'amount' ? 'Monto' :
                 key === 'fromCurrency' ? 'Moneda Origen' :
                 key === 'toCurrency' ? 'Moneda Destino' : key}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '0.82rem', color: 'var(--accent-amber)' }}>
          {parseResult?.error || 'Sintaxis en proceso... Escribe o selecciona un comando.'}
        </div>
      )}
    </div>
  );
};
