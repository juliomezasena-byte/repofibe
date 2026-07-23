/**
 * EvaluationEngine.js
 * Motor de evaluación pedagógica por invariantes de estado (Outcome-based).
 * Califica el progreso del estudiante comparando el estado del PNR contra las metas del escenario.
 */

export class EvaluationEngine {
  /**
   * Evalúa el progreso en el escenario actual.
   * @param {Object} scenario - Escenario cargado desde scenarios.json.
   * @param {Object} currentState - Estado actual retornado por PnrStateMachine.
   * @returns {Object} - Objeto de evaluación con score (0-100), completed (boolean), feedback ([]).
   */
  evaluate(scenario, currentState) {
    if (!scenario || !scenario.targetState) {
      return { score: 100, completed: true, feedback: ['No hay criterios de evaluación'] };
    }

    const state = currentState || {};
    const passengers = state.passengers || [];
    const segments = state.segments || [];
    const contacts = state.contacts || [];
    const ssrs = state.ssrs || [];
    const osis = state.osis || [];

    const target = scenario.targetState;
    const feedback = [];
    let checksPassed = 0;
    let totalChecks = 0;

    // 1. Pasajeros
    if (target.passengersCount !== undefined) {
      totalChecks++;
      if (passengers.length >= target.passengersCount) {
        checksPassed++;
        feedback.push(`[OK] Nombres de pasajeros registrados (${passengers.length}/${target.passengersCount}).`);
      } else {
        feedback.push(`[PENDIENTE] Faltan nombres de pasajeros (Ingresados: ${passengers.length}, Requeridos: ${target.passengersCount}).`);
      }
    }

    // 2. Segmentos de vuelo
    if (target.segmentsCount !== undefined) {
      totalChecks++;
      if (segments.length >= target.segmentsCount) {
        checksPassed++;
        feedback.push(`[OK] Segmentos de vuelo vendidos (${segments.length}/${target.segmentsCount}).`);
      } else {
        feedback.push(`[PENDIENTE] Falta vender segmentos de vuelo con SS (Ej: SS1Y1).`);
      }
    }

    // 3. Teléfono de contacto
    if (target.hasPhone) {
      totalChecks++;
      if (contacts.length > 0) {
        checksPassed++;
        feedback.push(`[OK] Información de contacto agregada (AP).`);
      } else {
        feedback.push(`[PENDIENTE] Falta ingresar teléfono de contacto AP (Ej: APBOG 573001234567-M).`);
      }
    }

    // 4. Ticketing
    if (target.hasTicketing) {
      totalChecks++;
      if (state.ticketing) {
        checksPassed++;
        feedback.push(`[OK] Opción de ticketing configurada (TK).`);
      } else {
        feedback.push(`[PENDIENTE] Falta registrar opción TK (Ej: TK OK).`);
      }
    }

    // 5. Received From
    if (target.hasReceivedFrom) {
      totalChecks++;
      if (state.receivedFrom) {
        checksPassed++;
        feedback.push(`[OK] Recibido de registrado (RF).`);
      } else {
        feedback.push(`[PENDIENTE] Falta ingresar recibido de RF (Ej: RF CLIENTE).`);
      }
    }

    // 6. Transaccionado (ER/ET)
    if (target.isTransacted) {
      totalChecks++;
      if (state.isTransacted) {
        checksPassed++;
        feedback.push(`[OK] PNR cerrado y guardado correctamente (ER/ET).`);
      } else {
        feedback.push(`[PENDIENTE] Falta guardar la transacción con ER.`);
      }
    }

    // 7. Cotización TST
    if (target.hasTst) {
      totalChecks++;
      if (state.tst) {
        checksPassed++;
        feedback.push(`[OK] Cotización y registro TST creado (FXP).`);
      } else {
        feedback.push(`[PENDIENTE] Falta cotizar la reserva con FXP.`);
      }
    }

    // 8. Tiquete emitido (TTP)
    if (target.isTicketed) {
      totalChecks++;
      if (state.isTicketed) {
        checksPassed++;
        feedback.push(`[OK] Tiquete electrónico emitido (TTP).`);
      } else {
        feedback.push(`[PENDIENTE] Falta emitir tiquete con TTP.`);
      }
    }

    // 9. SSR registrado
    if (target.hasSsr) {
      totalChecks++;
      if (ssrs.length > 0) {
        checksPassed++;
        feedback.push(`[OK] Servicio especial registrado (SR).`);
      } else {
        feedback.push(`[PENDIENTE] Falta registrar servicio especial SR (Ej: SR VGML).`);
      }
    }

    // 10. OSI registrado
    if (target.hasOsi) {
      totalChecks++;
      if (osis.length > 0) {
        checksPassed++;
        feedback.push(`[OK] Información OSI agregada (OS).`);
      } else {
        feedback.push(`[PENDIENTE] Falta agregar nota OSI con OS.`);
      }
    }

    // 11. Área limpia
    if (target.isClean) {
      totalChecks++;
      if (passengers.length === 0 && segments.length === 0) {
        checksPassed++;
        feedback.push(`[OK] Área de trabajo limpia con IG.`);
      } else {
        feedback.push(`[PENDIENTE] Ejecuta IG para ignorar la transacción.`);
      }
    }

    // 12. Consulta de ayuda
    if (target.viewedHelp) {
      totalChecks++;
      if (state.viewedHelp) {
        checksPassed++;
        feedback.push(`[OK] Comando HE ejecutado.`);
      } else {
        feedback.push(`[PENDIENTE] Ejecuta la ayuda con HE.`);
      }
    }

    const score = totalChecks > 0 ? Math.round((checksPassed / totalChecks) * 100) : 100;
    const completed = checksPassed === totalChecks;

    return {
      score,
      completed,
      checksPassed,
      totalChecks,
      feedback
    };
  }
}
