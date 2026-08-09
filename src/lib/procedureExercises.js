/**
 * procedureExercises.js
 * Mapeador universal de Procedimientos a Ejercicios Guiados Interactivos.
 * Permite que CADA procedimiento de la plataforma cuente con su propio ejercicio
 * interactivo guiado paso a paso con PNR semilla listo para practicar.
 */

export const PROCEDURE_CATEGORIES = {
  REEMISION: { id: 'reemision', nombre: '🔄 Reemisión y Cambios', color: '#0284c7' },
  EMD_SERVICIOS: { id: 'emd_servicios', nombre: '🧳 Servicios EMD y Equipaje', color: '#16a34a' },
  TICKETING: { id: 'ticketing', nombre: '🎫 Emisión y Tarifas', color: '#8b5cf6' },
  ESPECIALES: { id: 'especiales', nombre: '🐾 Pasajeros Especiales (UMNR/Mascotas)', color: '#ea580c' },
  INVOLUNTARIOS: { id: 'involuntarios', nombre: '⚠️ Cambios Involuntarios y Reembolsos', color: '#dc2626' }
};

export const PROCEDURE_EXERCISES = [
  // --- REEMISIÓNY CAMBIOS ---
  {
    id: 'proc-cambio-auto',
    procedimientoId: 'cambio-voluntario-automatico',
    categoriaId: 'reemision',
    titulo: 'Cambio Voluntario Automático (FXQ / FXI)',
    dificultad: 'Intermedio',
    duracionMin: 10,
    descripcion: 'Aprende a realizar un cambio voluntario automático cotizando con FXQ, ajustando la máscara TST de reemisión y emitiendo el nuevo billete.',
    seedPnr: {
      passengers: [{ name: 'SILVA/RODRIGO MR', type: 'ADT' }],
      segments: [
        { line: 1, flightNumber: 'IB6588', from: 'MAD', to: 'BCN', date: '15MAR', bookingClass: 'Y', status: 'HK1' },
        { line: 2, flightNumber: 'IB6589', from: 'BCN', to: 'MAD', date: '22MAR', bookingClass: 'Y', status: 'HK1' }
      ],
      issuedTicket: '075-2400998811',
      isTicketed: true
    }
  },
  {
    id: 'proc-cambio-manual-sin-volar',
    procedimientoId: 'cambio-manual-sin-segmento-volado',
    categoriaId: 'reemision',
    titulo: 'Cambio Manual sin Segmento Volado',
    dificultad: 'Avanzado',
    duracionMin: 15,
    descripcion: 'Calcula la diferencia tarifaria con DF, cancela el segmento anterior (XE), vende el nuevo vuelo (SS), crea el TST manual (FXP) y emite el cambio.',
    seedPnr: {
      passengers: [{ name: 'GARCIA/MIGUEL MR', type: 'ADT' }],
      segments: [
        { line: 1, flightNumber: 'IB0155', from: 'MAD', to: 'BOG', date: '10APR', bookingClass: 'Y', status: 'HK1' }
      ],
      issuedTicket: '075-8812940192',
      isTicketed: true
    }
  },
  {
    id: 'proc-cambio-manual-volado',
    procedimientoId: 'cambio-manual-con-segmento-volado',
    categoriaId: 'reemision',
    titulo: 'Cambio Manual con Segmento Volado',
    dificultad: 'Experto',
    duracionMin: 20,
    descripcion: 'Procesa un cambio sobre un billete parcialmente usado (cupón 1 volado). Requiere FQP con construcción por cupones, fecha DOI y penalidad.',
    seedPnr: {
      passengers: [{ name: 'MARTINEZ/LUCIA MS', type: 'ADT' }],
      segments: [
        { line: 1, flightNumber: 'IB6402', from: 'MEX', to: 'MAD', date: '01MAY', bookingClass: 'M', status: 'HK1' }
      ],
      issuedTicket: '075-9920194810',
      isTicketed: true
    }
  },

  // --- SERVICIOS EMD Y EQUIPAJE ---
  {
    id: 'proc-xbag',
    procedimientoId: 'equipaje-adicional-xbag',
    categoriaId: 'emd_servicios',
    titulo: 'Servicio de Equipaje Adicional (SRXBAG + EMD)',
    dificultad: 'Principiante',
    duracionMin: 8,
    descripcion: 'Registra una maleta adicional con el SSR SRXBAG, genera el TSM tarifario con FXG, ingresa la forma de pago TMI/FP y emite el EMD con TTM.',
    seedPnr: {
      passengers: [{ name: 'LOPEZ/ANA MRS', type: 'ADT' }],
      segments: [
        { line: 1, flightNumber: 'IB6588', from: 'MAD', to: 'BCN', date: '20APR', bookingClass: 'Y', status: 'HK1' }
      ],
      contacts: [{ type: 'AP', text: 'MAD 34600112233' }],
      ticketing: { status: 'TK OK' },
      isTicketed: true
    }
  },
  {
    id: 'proc-reemision-emd',
    procedimientoId: 'reemision-equipaje-emd',
    categoriaId: 'emd_servicios',
    titulo: 'Reemisión de EMD por Equipaje',
    dificultad: 'Avanzado',
    duracionMin: 12,
    descripcion: 'Transfiere un EMD de equipaje previamente emitido hacia un nuevo itinerario sin cobrar de nuevo la tasa al pasajero.',
    seedPnr: {
      passengers: [{ name: 'FERNANDEZ/CARLOS MR', type: 'ADT' }],
      segments: [
        { line: 1, flightNumber: 'IB0155', from: 'MAD', to: 'BOG', date: '15MAY', bookingClass: 'Y', status: 'HK1' }
      ],
      tsm: { id: 1, type: 'XBAG', total: 40, fop: 'CC' },
      tsmIssued: true
    }
  },
  {
    id: 'proc-servicios-adicionales',
    procedimientoId: 'servicios-adicionales',
    categoriaId: 'emd_servicios',
    titulo: 'Asignación de Asientos y Servicios Adicionales',
    dificultad: 'Principiante',
    duracionMin: 6,
    descripcion: 'Asigna asientos de pago (ST) y servicios opcionales SSR en reservas activas de Iberia.',
    seedPnr: {
      passengers: [{ name: 'RODRIGUEZ/ELENA MS', type: 'ADT' }],
      segments: [
        { line: 1, flightNumber: 'IB6402', from: 'MEX', to: 'MAD', date: '12JUN', bookingClass: 'Y', status: 'HK1' }
      ]
    }
  },

  // --- EMISIÓN Y TICKETING ---
  {
    id: 'proc-emision-latam',
    procedimientoId: 'emision-latam',
    categoriaId: 'ticketing',
    titulo: 'Emisión Vuelos LATAM / Código Compartido',
    dificultad: 'Intermedio',
    duracionMin: 10,
    descripcion: 'Flujo completo de cotización y emisión en vuelos de alianzas / LATAM respetando la regla del billete de 13 dígitos y FP.',
    seedPnr: {
      passengers: [{ name: 'SANCHEZ/PEDRO MR', type: 'ADT' }],
      segments: [
        { line: 1, flightNumber: 'LA8000', from: 'BOG', to: 'SCL', date: '18MAY', bookingClass: 'Y', status: 'HK1' }
      ],
      contacts: [{ type: 'AP', text: 'BOG 573109998877' }],
      ticketing: { status: 'TK OK' }
    }
  },
  {
    id: 'proc-split-simple',
    procedimientoId: 'generar-split',
    categoriaId: 'ticketing',
    titulo: 'División de Reserva (Split PNR - SP / EF)',
    dificultad: 'Intermedio',
    duracionMin: 8,
    descripcion: 'Separa un pasajero de una reserva grupal hacia un PNR independiente utilizando SP y finalizando con EF.',
    seedPnr: {
      passengers: [
        { name: 'TORRES/JAVIER MR', type: 'ADT' },
        { name: 'TORRES/MARIA MRS', type: 'ADT' }
      ],
      segments: [
        { line: 1, flightNumber: 'IB6588', from: 'MAD', to: 'BCN', date: '05JUN', bookingClass: 'Y', status: 'HK1' }
      ]
    }
  },
  {
    id: 'proc-split-complejo',
    procedimientoId: 'ejercicio-split-servicios-complejo',
    categoriaId: 'ticketing',
    titulo: 'Split PNR con Servicios EMD Asociados',
    dificultad: 'Avanzado',
    duracionMin: 15,
    descripcion: 'Divide una reserva que contiene elementos EMD y asientos de pago asignados sin perder la asociación del billete original.',
    seedPnr: {
      passengers: [
        { name: 'GOMEZ/DANIEL MR', type: 'ADT' },
        { name: 'GOMEZ/SOFIA MS', type: 'ADT' }
      ],
      segments: [
        { line: 1, flightNumber: 'IB0155', from: 'MAD', to: 'BOG', date: '25JUN', bookingClass: 'Y', status: 'HK1' }
      ],
      tsm: { id: 1, type: 'XBAG', total: 40 }
    }
  },

  // --- PASAJEROS ESPECIALES ---
  {
    id: 'proc-umnr',
    procedimientoId: 'umnr-menor-no-acompanado',
    categoriaId: 'especiales',
    titulo: 'Menor No Acompañado (UMNR)',
    dificultad: 'Intermedio',
    duracionMin: 10,
    descripcion: 'Registra la reserva para un menor de edad sin adulto, ingresando la edad en el nombre (CHD) y los datos del tutor de entrega y recogida con SR UMNR.',
    seedPnr: {
      passengers: [{ name: 'HERNANDEZ/DIEGO(CHD/10AUG16)', type: 'CHD' }],
      segments: [
        { line: 1, flightNumber: 'IB6588', from: 'MAD', to: 'BCN', date: '10JUL', bookingClass: 'Y', status: 'HK1' }
      ]
    }
  },
  {
    id: 'proc-petc',
    procedimientoId: 'mascota-en-cabina-petc',
    categoriaId: 'especiales',
    titulo: 'Mascota en Cabina (PETC)',
    dificultad: 'Intermedio',
    duracionMin: 10,
    descripcion: 'Verifica el peso y dimensiones del contenedor del animal, ingresa el SSR PETC con el peso en kg y la raza de la mascota.',
    seedPnr: {
      passengers: [{ name: 'NAVARRO/ISABEL MRS', type: 'ADT' }],
      segments: [
        { line: 1, flightNumber: 'IB0155', from: 'MAD', to: 'BOG', date: '02AUG', bookingClass: 'Y', status: 'HK1' }
      ]
    }
  },
  {
    id: 'proc-avih',
    procedimientoId: 'mascota-en-bodega-avih',
    categoriaId: 'especiales',
    titulo: 'Mascota en Bodega (AVIH)',
    dificultad: 'Intermedio',
    duracionMin: 10,
    descripcion: 'Registra animales de mayor tamaño en bodega con el SSR AVIH, especificando peso total del guacal y medidas.',
    seedPnr: {
      passengers: [{ name: 'RAMIREZ/JORGE MR', type: 'ADT' }],
      segments: [
        { line: 1, flightNumber: 'IB6402', from: 'MEX', to: 'MAD', date: '15AUG', bookingClass: 'Y', status: 'HK1' }
      ]
    }
  },
  {
    id: 'proc-svan',
    procedimientoId: 'perro-asistencia-svan',
    categoriaId: 'especiales',
    titulo: 'Perro de Asistencia / Lazarillo (SVAN)',
    dificultad: 'Principiante',
    duracionMin: 8,
    descripcion: 'Solicita la autorización gratuita para perro de asistencia médica/lazarillo con el SSR SVAN y certificación.',
    seedPnr: {
      passengers: [{ name: 'DIAZ/CARMEN MS', type: 'ADT' }],
      segments: [
        { line: 1, flightNumber: 'IB6588', from: 'MAD', to: 'BCN', date: '20AUG', bookingClass: 'Y', status: 'HK1' }
      ]
    }
  },

  // --- CAMBIOS INVOLUNTARIOS Y REEMBOLSOS ---
  {
    id: 'proc-involuntario-misma-ruta',
    procedimientoId: 'cambio-involuntario-misma-clase-ruta',
    categoriaId: 'involuntarios',
    titulo: 'Cambio Involuntario (Misma Ruta / Cancelación)',
    dificultad: 'Intermedio',
    duracionMin: 10,
    descripcion: 'Procesa la reprotección gratuita por cancelación o retraso del vuelo operado por la aerolínea manteniendo el itinerario.',
    seedPnr: {
      passengers: [{ name: 'ALVAREZ/ROBERTO MR', type: 'ADT' }],
      segments: [
        { line: 1, flightNumber: 'IB0155', from: 'MAD', to: 'BOG', date: '01SEP', bookingClass: 'Y', status: 'UN1' }
      ],
      issuedTicket: '075-1100223344',
      isTicketed: true
    }
  },
  {
    id: 'proc-reembolso-general',
    procedimientoId: 'reembolso-iberia-general',
    categoriaId: 'involuntarios',
    titulo: 'Solicitud de Reembolso General Iberia',
    dificultad: 'Intermedio',
    duracionMin: 10,
    descripcion: 'Calcula el importe a reembolsar y procesa la cancelación del billete y la devolución según la regulación tarifaria.',
    seedPnr: {
      passengers: [{ name: 'CASTRO/BEATRIZ MRS', type: 'ADT' }],
      segments: [
        { line: 1, flightNumber: 'IB6402', from: 'MEX', to: 'MAD', date: '10SEP', bookingClass: 'Y', status: 'HK1' }
      ],
      issuedTicket: '075-5544332211',
      isTicketed: true
    }
  }
];

export function getExercisesByCategory() {
  const map = {};
  for (const catKey of Object.keys(PROCEDURE_CATEGORIES)) {
    const cat = PROCEDURE_CATEGORIES[catKey];
    map[cat.id] = {
      ...cat,
      ejercicios: PROCEDURE_EXERCISES.filter((e) => e.categoriaId === cat.id)
    };
  }
  return map;
}

export function getExerciseById(id) {
  return PROCEDURE_EXERCISES.find((e) => e.id === id || e.procedimientoId === id);
}
