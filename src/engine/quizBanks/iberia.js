export const IBERIA_BANK = [
  {
    id: 'ib-q1',
    type: 'policy-duration',
    text: '¿Cuál es el orden correcto de mayor a menor duración de vuelo?',
    options: [
      'NRT-MAD, BOG-MAD, FRA-MAD, ACE-MAD',
      'BOG-MAD, NRT-MAD, ACE-MAD, FRA-MAD',
      'NRT-MAD, FRA-MAD, BOG-MAD, ACE-MAD',
      'FRA-MAD, ACE-MAD, BOG-MAD, NRT-MAD'
    ],
    correctIndex: 0,
    explanation: 'Narita (Tokio) es el más largo (~14.5h), seguido de Bogotá (~10h), Frankfurt (~2.75h) y Lanzarote (~2.5h).'
  },
  {
    id: 'ib-q2',
    type: 'policy-cabin',
    text: 'Selecciona las clases (RBD) que corresponden a Turista:',
    options: [
      'U, G, E, S',
      'C, J, D, I',
      'F, A, P, R',
      'Y, B, H, K'
    ],
    correctIndex: 0,
    explanation: 'Las clases U, G, E y S corresponden a diferentes niveles tarifarios de la cabina Turista en Iberia.'
  },
  {
    id: 'ib-q3',
    type: 'policy-cabin',
    text: '¿Cuáles clases de Turista permiten usar Avios para upgrade?',
    options: [
      'U, S',
      'G, E',
      'K, M',
      'Y, B'
    ],
    correctIndex: 0,
    explanation: 'En las opciones evaluadas, U y S son las respuestas esperadas para Turista con Avios.'
  },
  {
    id: 'ib-q4',
    type: 'policy-alliance',
    text: 'Identifica los miembros de la alianza Oneworld:',
    options: [
      'IB, BA, AA, AY, CX, QR, QF, JL',
      'IB, I2, YW',
      'VY, EI, LEVEL',
      'AF, KL, DL'
    ],
    correctIndex: 0,
    explanation: 'Oneworld incluye a Iberia, British Airways, American Airlines, Finnair, Cathay Pacific, Qatar, Qantas y Japan Airlines.'
  },
  {
    id: 'ib-q5',
    type: 'policy-amadeus',
    text: '¿Para qué sirve la transacción FXX?',
    options: [
      'Cotizar todas las tarifas combinables y disponibles para los vuelos seleccionados',
      'Buscar disponibilidad de vuelos',
      'Cancelar una reserva',
      'Emitir un billete'
    ],
    correctIndex: 0,
    explanation: 'FXX cotiza el itinerario sin crear un TST (Ticketed Status) permanente, ideal para consultar el precio exacto.'
  },
  {
    id: 'ib-q6',
    type: 'policy-pax',
    text: '¿Qué comando usas para reservar para Jenny Almanza viajando con un bebé (INF) de 11 meses (OPO-MUC)?',
    options: [
      'SNFECHAORGDES (1 Plaza)',
      'SNFECHAORGDES (2 Plazas)',
      'SS1Y1',
      'NM2ALMANZA/JENNY/INF'
    ],
    correctIndex: 0,
    explanation: 'Un infante (menor de 2 años) no ocupa plaza física a menos que se compre un asiento adicional pagando tarifa Child.'
  },
  {
    id: 'ib-q7',
    type: 'policy-amadeus',
    text: '¿Cuál es la diferencia entre SN y AN en Amadeus?',
    options: [
      'SN muestra clases disponibles, AN muestra disponibilidad general',
      'SN es para trenes, AN para vuelos',
      'SN es solo ida, AN ida y vuelta',
      'No hay diferencia'
    ],
    correctIndex: 0,
    explanation: 'SN (Schedule/Network) busca disponibilidad de clases específicas, AN (Availability Neutral) muestra disponibilidad general de vuelos.'
  },
  {
    id: 'ib-q8',
    type: 'policy-web',
    text: '¿Se puede asignar asiento por la web y tiene costo de gestión?',
    options: [
      'Sí, por "Gestión de reservas" sin gasto de gestión extra.',
      'No, solo por teléfono.',
      'Sí, pero siempre tiene gasto de gestión.',
      'Solo en el mostrador del aeropuerto.'
    ],
    correctIndex: 0,
    explanation: 'A través de la sección "Gestión de reservas" en iberia.com se puede seleccionar asiento; si la tarifa no lo incluye se paga el asiento, pero NO hay "gasto de gestión" (fee de emisión) adicional por usar la web.'
  },
  {
    id: 'ib-q9',
    type: 'policy-airport',
    text: 'Tiempo límite de cierre de mostrador para un vuelo intercontinental (MAD-BOG):',
    options: [
      '120 minutos',
      '45 minutos',
      '60 minutos',
      '90 minutos'
    ],
    correctIndex: 0,
    explanation: 'Para vuelos intercontinentales, el requerimiento en el examen es de 120 minutos (2 horas) como recomendación estándar.'
  },
  {
    id: 'ib-q10',
    type: 'policy-medical',
    text: 'Embarazo: ¿A partir de cuántas semanas se exige certificado médico?',
    options: [
      '28 semanas',
      '32 semanas',
      '36 semanas',
      '24 semanas'
    ],
    correctIndex: 0,
    explanation: 'A partir de la semana 28 de gestación se requiere un certificado médico emitido no más de 7 días antes del vuelo.'
  },
  {
    id: 'ib-q11',
    type: 'policy-web',
    text: '¿Cuál es la ruta web correcta para reclamaciones e incidencias?',
    options: [
      'IBERIA.COM -> Ayuda -> Servicios Online -> Ver más servicios -> Reclamaciones e incidencias',
      'IBERIA.COM -> Mis Viajes -> Reclamar',
      'IBERIA.COM -> Contacto -> Equipaje',
      'IBERIA.COM -> Check-in -> Incidencias'
    ],
    correctIndex: 0,
    explanation: 'La ruta oficial de auto-servicio es a través del menú de Ayuda -> Servicios Online.'
  }
];
