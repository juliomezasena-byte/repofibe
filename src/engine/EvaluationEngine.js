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

    // 13. Codificación de ciudad (DAN)
    if (target.hasEncoded) {
      totalChecks++;
      if (state.hasEncoded) {
        checksPassed++;
        feedback.push(`[OK] Ciudad codificada con DAN.`);
      } else {
        feedback.push(`[PENDIENTE] Codifica una ciudad con DAN (Ej: DAN LIMA).`);
      }
    }

    // 14. Decodificación de IATA (DAC)
    if (target.hasDecoded) {
      totalChecks++;
      if (state.hasDecoded) {
        checksPassed++;
        feedback.push(`[OK] Código IATA decodificado con DAC.`);
      } else {
        feedback.push(`[PENDIENTE] Decodifica un IATA con DAC (Ej: DAC BOG).`);
      }
    }

    // 15. Conversión de moneda (FQC)
    if (target.hasConverted) {
      totalChecks++;
      if (state.hasConverted) {
        checksPassed++;
        feedback.push(`[OK] Gasto de gestión convertido con FQC.`);
      } else {
        feedback.push(`[PENDIENTE] Convierte los gastos con FQC (Ej: FQC 35USD/DOP).`);
      }
    }

    // 16. Suma de tarifas (DF)
    if (target.usedDf) {
      totalChecks++;
      if (state.usedDf) {
        checksPassed++;
        feedback.push(`[OK] Suma total de tarifas calculada con DF.`);
      } else {
        feedback.push(`[PENDIENTE] Calcula el valor total del vuelo con DF.`);
      }
    }

    // 16b. Movimiento entre días (MN/MY/MO)
    if (target.usedMoveDay) {
      totalChecks++;
      if (state.usedMoveDay) {
        checksPassed++;
        feedback.push(`[OK] Navegaste entre días del itinerario (MN/MY/MO).`);
      } else {
        feedback.push(`[PENDIENTE] Muévete entre días con MN (siguiente), MY (anterior) o MO (original).`);
      }
    }

    // 16c. Penalidades del ticket (FQN*PE)
    if (target.viewedPenalties) {
      totalChecks++;
      if (state.viewedPenalties) {
        checksPassed++;
        feedback.push(`[OK] Consultaste las condiciones del ticket (FQN*PE).`);
      } else {
        feedback.push(`[PENDIENTE] Consulta reembolsos y cambios con FQN1*PE.`);
      }
    }

    // 17. Notas de reserva (RM)
    if (target.hasRemarks) {
      totalChecks++;
      const remarksCount = (state.remarks || []).length;
      const required = typeof target.hasRemarks === 'number' ? target.hasRemarks : 1;
      if (remarksCount >= required) {
        checksPassed++;
        feedback.push(`[OK] Notas registradas con RM (${remarksCount}/${required}).`);
      } else {
        feedback.push(`[PENDIENTE] Registra las notas con RM (${remarksCount}/${required}).`);
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
