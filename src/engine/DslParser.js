/**
 * DslParser.js
 * Motor de análisis léxico y tokenización desacoplado.
 * Interpreta entradas de terminal criptográficas utilizando las especificaciones DSL en JSON.
 */

export class DslParser {
  constructor(profileConfig) {
    this.commandsSpec = profileConfig?.commands || [];
  }

  /**
   * Carga una nueva configuración DSL de comandos.
   */
  setProfileConfig(profileConfig) {
    this.commandsSpec = profileConfig?.commands || [];
  }

  /**
   * Analiza una línea de comandos ingresada en la terminal.
   * @param {string} rawInput - Texto ingresado por el usuario (ej: "AN25NOVBOGMIA", "NM1GARCIA/CARLOS MR")
   * @returns {Object} - Objeto AST resultante con { success, code, commandSpec, params, rawInput, error }
   */
  parse(rawInput) {
    const input = (rawInput || '').trim().toUpperCase();
    if (!input) {
      return { success: false, error: 'NO COMMAND ENTERED' };
    }

    // 1. Identificar cuál comando coincide por prefijo o código exacto
    let matchedSpec = null;
    let matchedCode = '';

    for (const spec of this.commandsSpec) {
      if (input === spec.code || input.startsWith(spec.code)) {
        // Elegir la coincidencia de mayor longitud (ej: "FXX" vs "FXP")
        if (spec.code.length > matchedCode.length) {
          matchedCode = spec.code;
          matchedSpec = spec;
        }
      }
    }

    if (!matchedSpec) {
      return {
        success: false,
        rawInput: input,
        error: 'FORMAT ERROR - UNKNOWN COMMAND'
      };
    }

    const payload = input.slice(matchedSpec.code.length).trim();
    const parsedParams = {};

    // 2. Extraer parámetros utilizando los patrones Regex/Tokens definidos en el DSL
    if (matchedSpec.tokens && Object.keys(matchedSpec.tokens).length > 0) {
      let currentString = payload;

      for (const [paramName, patternStr] of Object.entries(matchedSpec.tokens)) {
        if (!currentString && !patternStr.includes('?')) {
          // El parámetro es obligatorio y la cadena está vacía
          continue;
        }

        try {
          const regex = new RegExp(patternStr, 'i');
          const match = currentString.match(regex);

          if (match) {
            // Asignar el primer grupo de captura o el match completo
            parsedParams[paramName] = match[1] !== undefined ? match[1] : match[0];
            // Remover la coincidencia consumida
            currentString = currentString.slice(match[0].length);
          }
        } catch (err) {
          console.warn(`Error al evaluar token ${paramName} para ${matchedSpec.code}:`, err);
        }
      }
    } else if (payload) {
      // Para comandos con texto libre (ej: "RF CARLOS")
      parsedParams['rawPayload'] = payload;
    }

    return {
      success: true,
      code: matchedSpec.code,
      commandSpec: matchedSpec,
      params: parsedParams,
      rawInput: input,
      handler: matchedSpec.handler
    };
  }
}
