import React, { useState } from 'react';
import { Ticket, QrCode, CheckCircle2, AlertCircle, Plane, Luggage, User, ShieldCheck } from 'lucide-react';

export function VisualTicketViewer({ activeScenario, history, evaluationResult }) {
  const [viewMode, setViewMode] = useState('ticket'); // 'ticket' | 'emd'

  // Determinar si el ticket fue emitido en la terminal (ej: comandos TTP, EMD, etc.)
  const isTicketed = history.some(h => /TTP|TTE|ETicket/i.test(h.command || '')) || evaluationResult?.completed;
  const hasEmd = history.some(h => /TTM|EMD|SRXBAG|PETC/i.test(h.command || ''));

  // Extraer datos del escenario activo o valores por defecto
  const pnr = activeScenario?.initialState?.pnr;
  const passengerName = pnr?.pasajeros?.[0] ? `${pnr.pasajeros[0].apellido}/${pnr.pasajeros[0].nombre}` : 'GARCIA/JUAN MR';
  const flight = pnr?.segmentos?.[0] || { aerolinea: 'IB', numero: '6253', origen: 'MAD', destino: 'MEX', fecha: '20AUG', clase: 'Y' };
  const recordLoc = pnr?.localizador || activeScenario?.id?.toUpperCase().replace('-', '') || 'IB820X';
  const ticketNumber = isTicketed ? `075-${Math.floor(1000000000 + Math.random() * 9000000000)}` : 'PENDIENTE DE EMISIÓN (TTP)';

  return (
    <div className="visual-ticket-container">
      <div className="visual-ticket-tabs">
        <button
          type="button"
          className={`ticket-tab ${viewMode === 'ticket' ? 'active' : ''}`}
          onClick={() => setViewMode('ticket')}
        >
          <Ticket size={16} /> E-Ticket 075 & Boarding Pass
        </button>
        <button
          type="button"
          className={`ticket-tab ${viewMode === 'emd' ? 'active' : ''}`}
          onClick={() => setViewMode('emd')}
        >
          <Luggage size={16} /> Recibo EMD & Servicios
        </button>
      </div>

      {viewMode === 'ticket' ? (
        <div className="boarding-pass-card" style={{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.92)), url('/images/boarding_pass_bg.webp')` }}>
          <div className="pass-header">
            <div className="pass-brand">
              <span className="pass-airline">IBERIA</span>
              <span className="pass-subtitle">ELECTRONIC TICKET / TARJETA DE EMBARQUE</span>
            </div>
            <div className={`pass-status ${isTicketed ? 'issued' : 'draft'}`}>
              {isTicketed ? (
                <><CheckCircle2 size={14} /> TICKET EMITIDO (OK)</>
              ) : (
                <><AlertCircle size={14} /> BORRADOR / SIN EMITIR</>
              )}
            </div>
          </div>

          <div className="pass-body">
            <div className="pass-row">
              <div className="pass-col">
                <span className="pass-label"><User size={12} /> PASAJERO</span>
                <span className="pass-value highlight">{passengerName}</span>
              </div>
              <div className="pass-col">
                <span className="pass-label">PNR / LOCALIZADOR</span>
                <span className="pass-value pnr-code">{recordLoc}</span>
              </div>
              <div className="pass-col">
                <span className="pass-label">Nº BILLETE 075</span>
                <span className="pass-value mono">{ticketNumber}</span>
              </div>
            </div>

            <div className="pass-divider"></div>

            <div className="pass-row flight-row">
              <div className="pass-route">
                <div className="airport">
                  <span className="iata">{flight.origen || 'MAD'}</span>
                  <span className="city">Origen</span>
                </div>
                <div className="route-arrow">
                  <Plane size={18} className="plane-icon" />
                  <span className="flight-num">{flight.aerolinea || 'IB'}{flight.numero || '6253'}</span>
                </div>
                <div className="airport">
                  <span className="iata">{flight.destino || 'MEX'}</span>
                  <span className="city">Destino</span>
                </div>
              </div>

              <div className="pass-flight-details">
                <div className="detail-item">
                  <span className="pass-label">FECHA</span>
                  <span className="pass-value">{flight.fecha || '20AUG'}</span>
                </div>
                <div className="detail-item">
                  <span className="pass-label">CLASE</span>
                  <span className="pass-value">{flight.clase || 'Y'}</span>
                </div>
                <div className="detail-item">
                  <span className="pass-label">ASIENTO</span>
                  <span className="pass-value seat-badge">12A</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pass-footer">
            <div className="qr-section">
              <QrCode size={48} className="qr-code" />
              <div className="qr-info">
                <span className="qr-text">M1{passengerName.replace('/', ' ')} E{recordLoc} {flight.origen}{flight.destino}{flight.aerolinea}{flight.numero}</span>
                <span className="qr-hint">Escáner IATA BCBP Validado</span>
              </div>
            </div>
            <div className="security-badge">
              <ShieldCheck size={16} /> Filtro Seguridad OK
            </div>
          </div>
        </div>
      ) : (
        <div className="emd-receipt-card">
          <div className="emd-header">
            <h4>Recibo EMD-A (Servicios Adicionales Iberia)</h4>
            <span className="emd-status">{hasEmd ? 'EMD GENERADO' : 'SIN SERVICIOS PAGO'}</span>
          </div>
          <div className="emd-body">
            <ul className="emd-list">
              <li className="emd-item">
                <Luggage size={16} />
                <div>
                  <strong>XBAG - Equipaje Adicional (23kg)</strong>
                  <p>Asociado a segmento {flight.origen}-{flight.destino} · Tarifa 35 USD</p>
                </div>
                <span className="emd-code">EMD 075-9921004</span>
              </li>
              <li className="emd-item">
                <User size={16} />
                <div>
                  <strong>PETC - Mascota en Cabina (Perro/Gato &lt; 8kg)</strong>
                  <p>Aceptación conforme normativa IATA · Confirmado</p>
                </div>
                <span className="emd-code">SR PETC OK</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
