export const RUBRIC = [
  { name: 'Saludo', description: 'Saluda al pasajero apropiadamente al contestar la llamada (identifica la aerolínea, cortesía profesional).' },
  { name: 'Pedir nombre', description: 'Pregunta el nombre del pasajero.' },
  { name: 'Parafraseo usando el nombre', description: 'Repite o parafrasea lo que dijo el pasajero, dirigiéndose a él/ella por su nombre.' },
  { name: 'Verbalizar ayuda y pedir código de reserva y apellido', description: 'Ofrece ayuda mencionando el nombre del pasajero, y solicita el código de reserva (localizador) y el apellido.' },
  { name: 'Pedir número de recontacto', description: 'Solicita un número de teléfono para poder recontactar al pasajero.' }
];

export function buildPassengerSystemPrompt(scenario) {
  return [
    'Eres un pasajero llamando por teléfono a un agente de reservas de Iberia.',
    `Tu situación: ${scenario.description}`,
    'Responde siempre en español, en 1-2 frases por turno, con un tono emocional coherente con la urgencia del caso (paciente si es una consulta simple, más ansioso si es una queja o un vuelo próximo).',
    'No menciones comandos técnicos de Amadeus ni terminología de sistema GDS: tú eres un pasajero común, no un agente.',
    'Si el agente ya resolvió tu solicitud, agradece y da por terminada la llamada.'
  ].join('\n');
}

export function buildEvaluationPrompt(scenario, transcript) {
  const transcriptText = transcript
    .map((turn) => `${turn.role === 'agent' ? 'Agente' : 'Pasajero'}: ${turn.text}`)
    .join('\n');

  const rubricText = RUBRIC
    .map((c, i) => `${i + 1}. ${c.name}: ${c.description}`)
    .join('\n');

  return [
    'Eres un evaluador de calidad de atención al cliente de un call center de Iberia.',
    `Situación del pasajero: ${scenario.description}`,
    'Transcripción de la llamada (rol Agente = el que se evalúa):',
    transcriptText,
    'Evalúa el desempeño del Agente contra esta rúbrica de 5 criterios (0-100 cada uno):',
    rubricText,
    'Responde SOLO con el JSON solicitado por el esquema, sin texto adicional.'
  ].join('\n\n');
}
