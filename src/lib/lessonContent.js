const LESSONS = {
  'scenario-1': {
    title: 'Consultar disponibilidad',
    objective: 'Aprender a buscar vuelos disponibles con origen, destino y fecha.',
    why: 'Es el primer paso real para ofrecer opciones al pasajero.',
    steps: ['Identifica origen, destino y fecha.', 'Consulta la disponibilidad con SN.', 'Lee número de vuelo, horario, clase y plazas abiertas.'],
    hint: 'Empieza con: SN 12 APR MEX SDQ'
  },
  'scenario-2': {
    title: 'Reservar dos pasajeros',
    objective: 'Crear una reserva sencilla para dos pasajeros adultos.',
    why: 'Convierte una búsqueda en una reserva que puede continuar hacia tarifa y emisión.',
    steps: ['Consulta el tramo.', 'Vende una plaza para cada pasajero.', 'Agrega los nombres y confirma el registro.'],
    hint: 'Primero necesitas una línea de disponibilidad seleccionable.'
  },
  'scenario-3': {
    title: 'Modificar y cancelar elementos',
    objective: 'Aprender a corregir un elemento del PNR usando XE.',
    why: 'Las reservas reales cambian constantemente y deben mantenerse limpias.',
    steps: ['Lee los números de línea.', 'Elimina solo el elemento indicado.', 'Comprueba que el resto del PNR permanece intacto.'],
    hint: 'XE seguido del número de línea elimina un elemento específico.'
  },
  'scenario-4': {
    title: 'Ignorar cambios de trabajo',
    objective: 'Distinguir cambios temporales de trabajo de cambios guardados.',
    why: 'Evita guardar accidentalmente una modificación que el cliente no aprobó.',
    steps: ['Realiza una modificación temporal.', 'Usa IG para descartarla.', 'Verifica que el PNR volvió al estado anterior.'],
    hint: 'IG abandona el área de trabajo sin guardar.'
  },
  'scenario-5': {
    title: 'Cotizar y guardar una tarifa',
    objective: 'Obtener una tarifa formal y guardar el TST con FXP.',
    why: 'La cotización formal es la base para informar y emitir correctamente.',
    steps: ['Completa los datos mínimos del PNR.', 'Ejecuta FXP.', 'Revisa el TST y la tarifa generada.'],
    hint: 'FXP calcula la tarifa y la almacena en el TST.'
  },
  'scenario-6': {
    title: 'Solicitar comida especial',
    objective: 'Añadir un servicio especial de comida vegetariana.',
    why: 'Los SSR permiten atender necesidades concretas del pasajero.',
    steps: ['Selecciona el pasajero.', 'Solicita el SSR VGML.', 'Guarda y verifica que el servicio quedó asociado.'],
    hint: 'VGML identifica la comida vegetariana.'
  },
  'scenario-7': {
    title: 'Registrar información OSI',
    objective: 'Añadir información operativa frecuente con OSI.',
    why: 'La información útil para la aerolínea debe quedar visible en el PNR.',
    steps: ['Identifica el dato que debe comunicarse.', 'Registra la línea OSI.', 'Redisplaya el PNR y comprueba el texto.'],
    hint: 'OSI comunica información a la aerolínea sin crear un servicio confirmado.'
  },
  'scenario-8': {
    title: 'Emitir el billete',
    objective: 'Completar el flujo de emisión de un billete electrónico.',
    why: 'La emisión transforma una reserva cotizada en un viaje documentado.',
    steps: ['Confirma que existe una tarifa.', 'Verifica forma de pago y datos obligatorios.', 'Emite con TTP y comprueba el número de billete.'],
    hint: 'No emitas antes de confirmar que el TST está listo.'
  },
  'scenario-9': {
    title: 'Consultar ayuda Amadeus',
    objective: 'Encontrar la sintaxis de un comando usando HE.',
    why: 'La ayuda integrada permite resolver dudas sin abandonar el sistema.',
    steps: ['Elige el comando que no recuerdas.', 'Consulta su ayuda con HE.', 'Usa la sintaxis encontrada en una práctica.'],
    hint: 'HE seguido del código muestra la ayuda del comando.'
  },
  'scenario-10': {
    title: 'Completar una reserva y emisión',
    objective: 'Integrar búsqueda, reserva, tarifa y emisión en un flujo completo.',
    why: 'Une las operaciones básicas en una situación parecida al trabajo real.',
    steps: ['Construye el PNR desde la disponibilidad.', 'Cotiza y confirma la tarifa.', 'Emite y verifica el resultado final.'],
    hint: 'Si algo falla, vuelve al último estado visible del PNR.'
  },
  'scenario-11': {
    title: 'Codificar ciudades y convertir moneda',
    objective: 'Usar DAN, DAC y FQC para resolver datos de una reserva.',
    why: 'Los códigos y las monedas correctas evitan errores de venta.',
    steps: ['Convierte el nombre de una ciudad a IATA.', 'Decodifica un código para comprobarlo.', 'Convierte el importe a la moneda solicitada.'],
    hint: 'DAN codifica una ciudad y DAC hace la operación inversa.'
  },
  'scenario-12': {
    title: 'Reservar adulto y niño',
    objective: 'Crear una reserva familiar con un adulto y un niño.',
    why: 'La edad del pasajero cambia la tarifa y los datos obligatorios.',
    steps: ['Crea el adulto.', 'Agrega el niño con fecha de nacimiento.', 'Cotiza y comprueba el desglose de tarifas.'],
    hint: 'La marca CHD y la fecha de nacimiento son parte del nombre del niño.'
  },
  'scenario-13': {
    title: 'Sumar tarifas y gastos',
    objective: 'Calcular el total de tarifas y gastos de gestión con DF.',
    why: 'Un desglose claro permite explicar el precio final al cliente.',
    steps: ['Separa los importes por tipo de pasajero.', 'Incluye el gasto de gestión.', 'Comprueba el total calculado.'],
    hint: 'DF recibe los importes en el formato indicado por el caso.'
  },
  'scenario-14': {
    title: 'Documentar tarifa y reembolso',
    objective: 'Registrar notas de tarifa y condiciones de reembolso con RM.',
    why: 'Las notas dejan evidencia de lo informado y protegen la operación.',
    steps: ['Identifica la condición que debes documentar.', 'Registra la nota RM.', 'Redisplaya el PNR y verifica el texto.'],
    hint: 'La nota debe describir la condición real, no una abreviatura inventada.'
  },
  'scenario-15': {
    title: 'Resolver un caso integrador',
    objective: 'Completar una reserva con tarifa Business Flex y varias reglas.',
    why: 'Practica decisiones encadenadas antes de pasar a cambios complejos.',
    steps: ['Construye y cotiza el PNR.', 'Documenta los datos especiales.', 'Completa la emisión verificando cada documento.'],
    hint: 'Divide el caso en bloques: PNR, tarifa, documentación y emisión.'
  },
  'scenario-16': {
    title: 'Moverse por fechas del itinerario',
    objective: 'Navegar entre días y volver a la fecha original con MN, MY y MO.',
    why: 'Buscar fechas cercanas es una tarea habitual cuando cambia el viaje.',
    steps: ['Avanza un día con MN.', 'Retrocede con MY.', 'Vuelve al día original con MO.'],
    hint: 'Observa la fecha activa después de cada comando.'
  },
  'scenario-17': {
    title: 'Consultar penalidades',
    objective: 'Leer penalidades paginadas y navegar el resultado.',
    why: 'La política de cambios debe consultarse antes de prometer una solución.',
    steps: ['Consulta las penalidades del ticket.', 'Lee la primera página.', 'Usa MD o MU para navegar cuando sea necesario.'],
    hint: 'No asumas que toda la información cabe en la primera pantalla.'
  },
  'scenario-18': {
    title: 'Confirmar contactos y plazo',
    objective: 'Registrar contactos seguros y un límite de ticketing.',
    why: 'Los contactos y plazos protegen la comunicación y la reserva.',
    steps: ['Agrega correo y teléfono.', 'Confirma los contactos requeridos.', 'Establece y verifica el plazo TKXL.'],
    hint: 'Comprueba el PNR después de cada dato sensible.'
  },
  'scenario-19': {
    title: 'Borrar líneas por rango o lista',
    objective: 'Eliminar líneas específicas sin tocar elementos vecinos.',
    why: 'La precisión al borrar evita daños en un PNR real.',
    steps: ['Identifica las líneas exactas.', 'Usa XE con rango o lista.', 'Redisplaya y confirma qué permaneció.'],
    hint: 'XE1-3 y XE1,3 no significan lo mismo.'
  },
  'scenario-20': {
    title: 'Reservar un infante',
    objective: 'Crear una reserva de adulto con infante en brazos.',
    why: 'Los datos de infante tienen requisitos especiales de nombre y tarifa.',
    steps: ['Agrega el adulto con el infante.', 'Incluye el SSR y la fecha requerida.', 'Cotiza y verifica la tarifa de infante.'],
    hint: 'El nombre del infante debe conservar la relación con el adulto.'
  },
  'scenario-21': {
    title: 'Emitir equipaje extra',
    objective: 'Solicitar equipaje y emitir el documento EMD asociado.',
    why: 'Los servicios adicionales deben quedar cobrados y documentados.',
    steps: ['Solicita el servicio de equipaje.', 'Crea y revisa el TSM.', 'Emite el EMD y verifica su número.'],
    hint: 'El TSM representa el documento de servicio, separado del TST.'
  },
  'scenario-22': {
    title: 'Completar un flujo de ticketing',
    objective: 'Resolver un caso integral con ticket, servicio y gastos.',
    why: 'Simula el cierre operativo de una reserva compleja.',
    steps: ['Completa la reserva y tarifa.', 'Gestiona el servicio adicional.', 'Verifica y emite todos los documentos.'],
    hint: 'Antes de emitir, verifica TST, TSM, forma de pago y recibo.'
  },
  'scenario-23': {
    title: 'Cambiar solo la ida',
    objective: 'Reemitir únicamente el tramo de ida sin alterar la vuelta.',
    why: 'Los cambios parciales requieren controlar exactamente qué segmentos se tocan.',
    steps: ['Consulta el ticket y busca la nueva ida.', 'Vende y cotiza solo el segmento cambiado.', 'Documenta la diferencia y emite la reemisión.'],
    hint: 'Comprueba que la vuelta conserva su fecha y vuelo originales.'
  },
  'scenario-24': {
    title: 'Completar un cambio voluntario',
    objective: 'Resolver una reemisión completa con penalidad, diferencia y EMD.',
    why: 'Es el flujo avanzado que reúne todos los aprendizajes anteriores.',
    steps: ['Consulta reglas y penalidades.', 'Cambia ambos segmentos y calcula la diferencia.', 'Emite billete y EMD verificando el resultado.'],
    hint: 'Trabaja por bloques y no emitas hasta validar TST y TSM.'
  }
};

function fallbackTitle(scenario) {
  return scenario?.title?.replace(/^Nivel\s+\d+:\s*/, '') || 'Práctica Amadeus';
}

export function getLessonContent(scenario) {
  const custom = LESSONS[scenario?.id] || {};
  const flow = Array.isArray(scenario?.suggestedFlow) ? scenario.suggestedFlow : [];
  return {
    title: custom.title || fallbackTitle(scenario),
    objective: custom.objective || `Completa la práctica: ${fallbackTitle(scenario)}.`,
    why: custom.why || 'Esta práctica refuerza el manejo operativo del simulador.',
    steps: custom.steps || [
      'Lee el caso y localiza los datos importantes.',
      'Sigue el flujo sugerido en el simulador.',
      'Comprueba el resultado antes de terminar.'
    ],
    hint: custom.hint || (flow[0] ? `Puedes empezar con: ${flow[0]}` : 'Lee el caso antes de escribir el primer comando.'),
    suggestedFlow: flow.slice(0, 4)
  };
}
