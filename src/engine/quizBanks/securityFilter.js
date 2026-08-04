export const SECURITY_FILTER_BANK = [
  {
    id: 'sec-q1',
    type: 'security-filter',
    text: '¿Cuáles son los 3 datos fundamentales que componen el Filtro de Seguridad obligatorio antes de brindar información o modificar un PNR?',
    options: [
      'Nombre completo del titular, Código de reserva (PNR) y Dato de recontacto (Teléfono o Correo)',
      'Número de tarjeta de crédito, Dirección de residencia y Pasaporte',
      'Fecha de nacimiento, Nombre de la aerolínea y Clase de reserva',
      'Solo con el nombre del pasajero es suficiente'
    ],
    correctIndex: 0,
    explanation: 'El filtro de seguridad exige verificar el nombre completo del titular, el localizador/PNR y un dato de contacto registrado (teléfono o correo) antes de manipular la reserva.',
    source: 'Protocolo de Seguridad Iberia / Foundever'
  },
  {
    id: 'sec-q2',
    type: 'security-filter',
    text: '¿Qué frase es OBLIGATORIA al retomar la llamada luego de haber puesto al cliente en espera en la línea?',
    options: [
      '"Gracias por su permanencia en la línea"',
      '"Ya volví, disculpe la demora"',
      '"Listo, ya le revisé el sistema"',
      '"¿Sigue ahí el pasajero?"'
    ],
    correctIndex: 0,
    explanation: 'Según el protocolo de calidad, siempre se debe agradecer la espera con la frase exacta: "Gracias por su permanencia en la línea".',
    source: 'Protocolo de Calidad / Evaluador de Llamadas'
  },
  {
    id: 'sec-q3',
    type: 'security-filter',
    text: '¿Qué debe hacer el agente ANTES de silenciar su micrófono o poner al pasajero en espera?',
    options: [
      'Informar la razón de la espera ("Permítame un momento mientras verifico en el sistema...")',
      'Poner en silenciador de inmediato sin decir nada',
      'Colgar la llamada si tarda más de un minuto',
      'Pedirle al cliente que vuelva a llamar más tarde'
    ],
    correctIndex: 0,
    explanation: 'El protocolo exige informar siempre el motivo de la espera antes de pausar la llamada para que el cliente sepa qué se está realizando.',
    source: 'Protocolo de Calidad / Evaluador de Llamadas'
  },
  {
    id: 'sec-q4',
    type: 'security-filter',
    text: '¿Cuál es el tratamiento verbal que se debe mantener con el cliente durante toda la atención?',
    options: [
      'Trato formal de "Usted", sin tutear y dirigiéndose al cliente por su nombre',
      'Tuteo cercano para generar confianza ("Oye mira, te comento...")',
      'Hablar solo en tercera persona sin usar el nombre del cliente',
      'Usar modismos informales según el país del cliente'
    ],
    correctIndex: 0,
    explanation: 'Se debe mantener un estándar profesional formal utilizando "Usted" y personalizando la atención con el nombre del cliente.',
    source: 'Protocolo de Calidad / Evaluador de Llamadas'
  },
  {
    id: 'sec-q5',
    type: 'security-filter',
    text: '¿En qué consiste la técnica de Parafraseo y por qué es obligatoria?',
    options: [
      'Consiste en repetir o resumir con respeto la solicitud del cliente para reconfirmar que se entendió correctamente',
      'Consiste en leer al cliente todo el manual de políticas de la aerolínea',
      'Consiste en corregir al cliente cuando se equivoca al hablar',
      'Consiste en repetir las mismas palabras del cliente en inglés'
    ],
    correctIndex: 0,
    explanation: 'El parafraseo asegura que el agente entendió perfectamente el requerimiento antes de ejecutar cualquier comando o cambio.',
    source: 'Protocolo de Calidad / Evaluador de Llamadas'
  },
  {
    id: 'sec-q6',
    type: 'security-filter',
    text: 'Un pasajero solicita cambiar su asiento a cabina "Premium Economy" en un vuelo Madrid (MAD) ➔ Barcelona (BCN). ¿Qué debe responder el agente?',
    options: [
      'Aclarar que en vuelos de corto radio NO existe cabina Premium Economy (solo Turista y Business)',
      'Vender el asiento en Premium Economy inmediatamente',
      'Decirle que la cabina Premium solo la vende la agencia de viajes',
      'Transferir la llamada al aeropuerto'
    ],
    correctIndex: 0,
    explanation: 'Regla de producto Iberia: La cabina Premium Economy / Turista Premium está disponible ÚNICAMENTE para vuelos de largo radio.',
    source: 'Reglas de Producto Iberia'
  },
  {
    id: 'sec-q7',
    type: 'security-filter',
    text: 'Si el cliente se niega a suministrar los datos del Filtro de Seguridad o la información no coincide con la reserva activa, ¿cuál es el procedimiento?',
    options: [
      'Explicar que por seguridad no se pueden divulgar ni modificar datos sensibles del PNR sin validación exitosa',
      'Ignorar el filtro y hacer la modificación de todas formas',
      'Cancelar la reserva del cliente como penalización',
      'Dar la información si el cliente insiste con enojo'
    ],
    correctIndex: 0,
    explanation: 'La protección de datos exige no divulgar detalles sensibles si el filtro de seguridad no es superado exitosamente.',
    source: 'Protocolo de Seguridad / Ley de Protección de Datos'
  }
];
