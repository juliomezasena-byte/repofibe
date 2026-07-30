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
    text: '¿Cuáles de las siguientes letras (RBD) corresponden tradicionalmente a tarifas de la cabina Turista (Economy)?',
    options: [
      'Y, B, H, K, M, L',
      'J, C, D, I, R',
      'W, E, T, P',
      'F, A'
    ],
    correctIndex: 0,
    explanation: 'Las letras Y, B, H, K, M, L (entre otras) denotan tarifas comerciales de Turista. J/C/D son Business y W/E/T son Turista Premium.'
  },
  {
    id: 'ib-q3',
    type: 'policy-cabin',
    text: '¿Cuáles clases de Turista flexible permiten solicitar un upgrade a Business usando Avios?',
    options: [
      'Y, B, H',
      'U, S',
      'K, M',
      'G, E'
    ],
    correctIndex: 0,
    explanation: 'En Iberia, normalmente solo las tarifas más altas/flexibles de Turista (Y, B o H) son elegibles para solicitar un Upgrade utilizando Avios.'
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
    text: '¿Cuál es la principal diferencia entre los comandos SN y AN en Amadeus?',
    options: [
      'SN muestra todas las clases del vuelo (abiertas o cerradas); AN muestra solo las clases con disponibilidad.',
      'SN es para vuelos internacionales; AN es para vuelos domésticos.',
      'SN muestra solo ida; AN muestra ida y vuelta.',
      'No hay diferencia, ambos hacen lo mismo.'
    ],
    correctIndex: 0,
    explanation: 'SN (Schedule) muestra el itinerario general con todas las clases de reserva, estén llenas o no. AN (Availability) filtra y muestra ÚNICAMENTE las clases que aún tienen plazas disponibles.'
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
      '55 minutos',
      '45 minutos',
      '60 minutos',
      '120 minutos'
    ],
    correctIndex: 0,
    explanation: 'Debido a la peculiaridad de los vuelos operados por Iberia desde la T4 en Madrid, el tiempo límite de cierre de facturación es de 55 minutos antes de la salida.'
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
