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

    // 7b. Cambio Voluntario Manual — TST viejo eliminado (TTE)
    if (target.usedTte) {
      totalChecks++;
      if (state.usedTte) {
        checksPassed++;
        feedback.push(`[OK] TST anterior eliminado (TTE).`);
      } else {
        feedback.push(`[PENDIENTE] Elimina el TST anterior con TTE/ALL.`);
      }
    }

    // 7c. Cambio Voluntario Manual — TST marcado en reemisión (TTI/EXCH)
    if (target.markedExchange) {
      totalChecks++;
      if (state.markedExchange) {
        checksPassed++;
        feedback.push(`[OK] TST marcado en reemisión (TTI/EXCH).`);
      } else {
        feedback.push(`[PENDIENTE] Marca el TST en reemisión con TTI/EXCH/T{n}.`);
      }
    }

    // 7d. Cambio Voluntario Manual — diferencia de tarifa agregada (TTK)
    if (target.fareDiffAdded) {
      totalChecks++;
      if (state.fareDiffAdded) {
        checksPassed++;
        feedback.push(`[OK] Diferencia de tarifa agregada al TST (TTK).`);
      } else {
        feedback.push(`[PENDIENTE] Agrega la diferencia de tarifa con TTK/T{n}/T{valor}.`);
      }
    }

    // 7e. Cambio Voluntario Manual — valor de penalidad cargado al TSM (TMI/M.../F.../CV-)
    if (target.penaltyValueAdded) {
      totalChecks++;
      if (state.penaltyValueAdded) {
        checksPassed++;
        feedback.push(`[OK] Valor de penalidad y cupón cargados al TSM (TMI).`);
      } else {
        feedback.push(`[PENDIENTE] Carga el valor de la penalidad con TMI/M{n}/F{valor}/CV-{valor}.`);
      }
    }

    // 7f. Cambio Voluntario Manual — emisión combinada realmente ejecutada
    // (isTicketed solo no basta: el billete original ya siembra
    // isTicketed:true, así que por sí solo no prueba la reemisión).
    if (target.combinedIssueDone) {
      totalChecks++;
      if (state.combinedIssueDone) {
        checksPassed++;
        feedback.push(`[OK] Emisión combinada de billete + EMD ejecutada (TTP1/TTM).`);
      } else {
        feedback.push(`[PENDIENTE] Emite el cambio con TTP1/TTM/T{n}/M{n}/ET/RT.`);
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

    // 16d. Facturación ejecutada (FXX/FXP)
    if (target.usedFxx) {
      totalChecks++;
      if (state.usedFxx) {
        checksPassed++;
        feedback.push(`[OK] Tarifa facturada (FXX/FXP).`);
      } else {
        feedback.push(`[PENDIENTE] Factura la tarifa con FXX (Ej: FXX/FF-OPTIMA/RAD,SDQ).`);
      }
    }

    // 16e. Navegación de páginas (MD/MU)
    // Specific fare evidence prevents a generic FXX/FXP from satisfying a
    // lesson that requires a particular fare family, modifier, or office.
    if (target.requiredFareQuote) {
      totalChecks++;
      const requirement = target.requiredFareQuote;
      const quoteFound = (state.pricingHistory || []).some((quote) =>
        (!requirement.command || quote.command === requirement.command) &&
        (!requirement.fareFamily || quote.fareFamily === requirement.fareFamily) &&
        (!requirement.modifier || (quote.modifiers || []).includes(requirement.modifier)) &&
        (!requirement.office || quote.office === requirement.office)
      );
      if (quoteFound) {
        checksPassed++;
        feedback.push(`[OK] Facturacion con ${requirement.command || 'FXX/FXP'} y los parametros solicitados.`);
      } else {
        feedback.push(`[PENDIENTE] Factura con ${requirement.command || 'FXX'} y los parametros requeridos.`);
      }
    }

    // The INF detail must be attached to the adult in NM; passenger count alone
    // cannot prove that this exercise was completed.
    if (target.requiredInfant) {
      totalChecks++;
      const requirement = target.requiredInfant;
      const infantFound = (state.infants || []).some((infant) => {
        const linkedAdult = passengers.find((passenger) => passenger.id === infant.linkedPassengerId);
        return infant.surname === requirement.surname &&
          infant.firstName === requirement.firstName &&
          infant.dateOfBirth === requirement.dateOfBirth &&
          (!requirement.linkedAdult || linkedAdult?.name?.toUpperCase().startsWith(requirement.linkedAdult));
      });
      if (infantFound) {
        checksPassed++;
        feedback.push('[OK] Infante registrado y asociado al adulto (INF).');
      } else {
        feedback.push('[PENDIENTE] Registra el infante dentro del NM del adulto (INF apellido/nombre/fecha).');
      }
    }

    if (target.usedPaging) {
      totalChecks++;
      if (state.usedPaging) {
        checksPassed++;
        feedback.push(`[OK] Navegaste entre páginas (MD/MU).`);
      } else {
        feedback.push(`[PENDIENTE] Avanza y retrocede páginas con MD y MU.`);
      }
    }

    // 16f. Cantidad mínima de contactos (confirmación + seguridad)
    if (target.contactsCount !== undefined) {
      totalChecks++;
      if (contacts.length >= target.contactsCount) {
        checksPassed++;
        feedback.push(`[OK] Contactos registrados (${contacts.length}/${target.contactsCount}).`);
      } else {
        feedback.push(`[PENDIENTE] Faltan contactos (${contacts.length}/${target.contactsCount}).`);
      }
    }

    // 16g. Cantidad mínima de SSR
    if (target.ssrCount !== undefined) {
      totalChecks++;
      if (ssrs.length >= target.ssrCount) {
        checksPassed++;
        feedback.push(`[OK] Solicitudes SR registradas (${ssrs.length}/${target.ssrCount}).`);
      } else {
        feedback.push(`[PENDIENTE] Faltan solicitudes SR (${ssrs.length}/${target.ssrCount}).`);
      }
    }

    // 16h. Consultas de ayuda por tema (HE {comando})
    if (target.helpTopicsCount !== undefined) {
      totalChecks++;
      const topics = new Set((state.helpTopics || []).filter((t) => t !== 'GENERAL'));
      if (topics.size >= target.helpTopicsCount) {
        checksPassed++;
        feedback.push(`[OK] Consultaste la ayuda de ${topics.size} comandos.`);
      } else {
        feedback.push(`[PENDIENTE] Consulta la ayuda de ${target.helpTopicsCount} comandos distintos (Ej: HE AN, HE NM).`);
      }
    }

    // 16i. Texto prohibido en contactos (el dato erróneo debe desaparecer)
    if (target.forbiddenContactText) {
      totalChecks++;
      const sigue = contacts.some((c) => (c.text || '').includes(target.forbiddenContactText));
      if (!sigue) {
        checksPassed++;
        feedback.push(`[OK] El contacto erróneo fue eliminado (XE).`);
      } else {
        feedback.push(`[PENDIENTE] El teléfono erróneo sigue en el PNR — bórralo con XE.`);
      }
    }

    // 16j. Texto prohibido en remarks (las notas erróneas deben desaparecer)
    if (target.forbiddenRemarkText) {
      totalChecks++;
      const sigue = (state.remarks || []).some((r) => (r.text || '').includes(target.forbiddenRemarkText));
      if (!sigue) {
        checksPassed++;
        feedback.push(`[OK] Las notas erróneas fueron eliminadas (XE).`);
      } else {
        feedback.push(`[PENDIENTE] Quedan notas erróneas en el PNR — bórralas con XE (rango o lista).`);
      }
    }

    // 16k. Servicio de equipaje solicitado (SRXBAG)
    // Counting any RM is insufficient when the scenario prescribes a specific
    // operational note; compare normalized complete note text instead.
    if (target.requiredRemarkText) {
      totalChecks++;
      const normalizeRemark = (text) => String(text || '').trim().toUpperCase().replace(/\s+/g, ' ');
      const requiredRemark = normalizeRemark(target.requiredRemarkText);
      if ((state.remarks || []).some((remark) => normalizeRemark(remark.text) === requiredRemark)) {
        checksPassed++;
        feedback.push('[OK] Nota correcta registrada con RM.');
      } else {
        feedback.push(`[PENDIENTE] Registra la nota exacta con RM: ${target.requiredRemarkText}.`);
      }
    }

    // Verify the successful XE syntax for lessons that explicitly teach a
    // range/list operation, rather than inferring it only from final state.
    if (target.requiredCancelSpec) {
      totalChecks++;
      const expectedSpec = String(target.requiredCancelSpec).replace(/\s+/g, '');
      if ((state.cancelOperations || []).some((operation) => operation.spec === expectedSpec)) {
        checksPassed++;
        feedback.push(`[OK] Borrado por rango ejecutado con XE${expectedSpec}.`);
      } else {
        feedback.push(`[PENDIENTE] Borra las celdas con XE${expectedSpec}.`);
      }
    }

    if (target.hasBaggage) {
      totalChecks++;
      if ((state.baggage || []).length > 0) {
        checksPassed++;
        feedback.push(`[OK] Servicio de equipaje solicitado (SRXBAG).`);
      } else {
        feedback.push(`[PENDIENTE] Solicita el equipaje con SRXBAG/P1/S1.`);
      }
    }

    // 16l. EMD del servicio emitido (TTM)
    if (target.tsmIssued) {
      totalChecks++;
      if (state.tsmIssued) {
        checksPassed++;
        feedback.push(`[OK] EMD del servicio emitido (TTM).`);
      } else {
        feedback.push(`[PENDIENTE] Emite el EMD del servicio con TTM/M1/RT (antes: FXG, TMI/FP-).`);
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
