import React, { useState } from 'react';
import { Search, BookOpen, Layers, DollarSign, Users } from 'lucide-react';

export const GdsDictionary = () => {
  const [query, setQuery] = useState('');

  const dictionaryData = [
    { code: 'AN', category: 'Comandos', title: 'Availability Neutral', desc: 'Muestra los vuelos con cupos y clases abiertas en tiempo real.' },
    { code: 'SN', category: 'Comandos', title: 'Schedule Neutral', desc: 'Muestra la lista neutral de horarios publicados (incluso si está lleno).' },
    { code: 'DAN', category: 'Comandos', title: 'Encode City', desc: 'Convierte el nombre de una ciudad o aeropuerto a su código IATA de 3 letras (ej: DAN LIMA -> LIM).' },
    { code: 'DAC', category: 'Comandos', title: 'Decode Code', desc: 'Muestra el nombre de la ciudad/aeropuerto a partir del código IATA (ej: DAC BOG -> BOGOTA).' },
    { code: 'FQC', category: 'Comandos', title: 'Currency Conversion', desc: 'Convierte montos entre divisas (ej: FQC35USD/COP) aplicando la tasa de cambio.' },
    { code: 'SS', category: 'Comandos', title: 'Sell Segment', desc: 'Reserva asientos en una clase de vuelo específica (ej: SS1Y1 = 1 asiento clase Y en línea 1).' },
    { code: 'FXX', category: 'Comandos', title: 'Informative Pricing', desc: 'Cotiza el itinerario sin guardar el registro de tarifa TST en el PNR.' },
    { code: 'FXP', category: 'Comandos', title: 'Price & Store TST', desc: 'Cotiza e ingresa el registro oficial TST en la reserva para permitir la emisión.' },
    { code: 'TTP', category: 'Comandos', title: 'Issue Ticket', desc: 'Emite el tiquete electrónico (e-ticket).' },
    { code: 'J / C / D', category: 'Cabinas', title: 'Clase Business / Ejecutiva', desc: 'Cabina superior con asientos cama, prioridad de abordaje y catering VIP.' },
    { code: 'W / P', category: 'Cabinas', title: 'Clase Turista Premium', desc: 'Asientos más anchos, mayor recline y equipaje adicional.' },
    { code: 'Y / B / M / K / Q', category: 'Cabinas', title: 'Clase Turista / Economy', desc: 'Cabina estándar. Y es la tarifa flexible, Q/N/S son promocionales restrictivas.' },
    { code: 'ADT', category: 'Pasajeros', title: 'Adulto', desc: 'Pasajero mayor de 12 años.' },
    { code: 'CHD / CNN', category: 'Pasajeros', title: 'Niño (Child)', desc: 'Pasajero de 2 a 11 años. Requiere fecha de nacimiento.' },
    { code: 'INF / INFT', category: 'Pasajeros', title: 'Infante (Infant)', desc: 'Pasajero menor de 2 años viajando en regazo.' },
    { code: 'RAD', category: 'Descuentos', title: 'Descuento Residente', desc: 'Aplica tarifas especiales de residencia (ej: Islas en España).' }
  ];

  const filtered = dictionaryData.filter(item =>
    item.code.toLowerCase().includes(query.toLowerCase()) ||
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="card-panel" style={{ flex: 1, overflowY: 'auto' }}>
      <div className="card-panel-title">
        <BookOpen size={18} className="text-primary-cyan" />
        <span>Glosario & Diccionario GDS Amadeus</span>
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
        <input
          type="text"
          className="scenario-select"
          style={{ paddingLeft: 36 }}
          placeholder="Buscar código (ej: AN, FQC, J, CHD, Y)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        {filtered.map((item, idx) => (
          <div key={idx} className="mission-brief-card">
            <div className="brief-tag-row">
              <span className="token-val" style={{ fontSize: '1rem' }}>{item.code}</span>
              <span className="difficulty-badge">{item.category}</span>
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-heading)' }}>
              {item.title}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-body)' }}>
              {item.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
