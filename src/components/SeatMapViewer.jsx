import React, { useState } from 'react';
import { Armchair, UserCheck, ShieldAlert, Sparkles, Check } from 'lucide-react';

export function SeatMapViewer({ activeScenario, history, onChipTap }) {
  const [selectedSeat, setSelectedSeat] = useState('12A');

  // Asientos asignados detectados en la terminal (ej. ST/12A o ST/S3/P1)
  const lastSeatCmd = history.filter(h => /^ST\//i.test(h.command || '')).slice(-1)[0]?.command;
  const activeSeat = lastSeatCmd ? lastSeatCmd.replace(/^ST\//i, '').toUpperCase() : selectedSeat;

  // Filas del mapa de cabina
  const rows = [
    { num: 1, type: 'business' },
    { num: 2, type: 'business' },
    { num: 3, type: 'business' },
    { num: 10, type: 'premium' },
    { num: 11, type: 'premium' },
    { num: 12, type: 'tourist', exit: true },
    { num: 14, type: 'tourist' },
    { num: 15, type: 'tourist' },
    { num: 16, type: 'tourist' },
    { num: 20, type: 'tourist' },
  ];

  const cols = ['A', 'B', 'C', 'D', 'E', 'F'];

  const handleSeatClick = (seatCode) => {
    setSelectedSeat(seatCode);
    if (onChipTap) {
      onChipTap(`ST/${seatCode}`);
    }
  };

  return (
    <div className="seatmap-container" style={{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.95)), url('/images/cabin_layout_bg.webp')` }}>
      <div className="seatmap-header">
        <div className="seatmap-title">
          <Armchair size={20} />
          <div>
            <h4>Mapa de Cabina Airbus A350-900</h4>
            <p>Selecciona un asiento para insertar el comando <code>ST/</code> en la terminal</p>
          </div>
        </div>
        <div className="active-seat-badge">
          <UserCheck size={16} /> Asiento: <strong>{activeSeat}</strong>
        </div>
      </div>

      <div className="seatmap-legend">
        <span className="legend-item business"><span className="box"></span> Business</span>
        <span className="legend-item premium"><span className="box"></span> Turista Premium</span>
        <span className="legend-item exit"><ShieldAlert size={12} /> Salida Emergencia</span>
        <span className="legend-item selected"><Check size={12} /> Asignado</span>
      </div>

      <div className="seatmap-grid-wrapper">
        <div className="seatmap-grid">
          {rows.map((row) => (
            <div key={row.num} className={`seatmap-row row-${row.type} ${row.exit ? 'exit-row' : ''}`}>
              <span className="row-num">{row.num}</span>
              <div className="seat-group group-left">
                {['A', 'B', 'C'].map((col) => {
                  const code = `${row.num}${col}`;
                  const isSelected = activeSeat === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      className={`seat-btn ${row.type} ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSeatClick(code)}
                      title={`Asiento ${code} (${row.type.toUpperCase()})`}
                    >
                      {code}
                    </button>
                  );
                })}
              </div>

              <div className="aisle">PASILLO</div>

              <div className="seat-group group-right">
                {['D', 'E', 'F'].map((col) => {
                  const code = `${row.num}${col}`;
                  const isSelected = activeSeat === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      className={`seat-btn ${row.type} ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSeatClick(code)}
                      title={`Asiento ${code} (${row.type.toUpperCase()})`}
                    >
                      {code}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
