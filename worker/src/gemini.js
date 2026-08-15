const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function generatePassengerReply(apiKey, model, systemPrompt, history) {
  const contents = history.map((turn) => ({
    role: turn.role === 'agent' ? 'user' : 'model',
    parts: [{ text: turn.text }]
  }));

  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini respondió ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini no devolvió texto en la respuesta');
  }
  return text.trim();
}

export async function generateEvaluation(apiKey, model, evaluationPrompt) {
  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: evaluationPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            score: { type: 'NUMBER' },
            strengths: { type: 'ARRAY', items: { type: 'STRING' } },
            improvements: { type: 'ARRAY', items: { type: 'STRING' } }
          },
          required: ['score', 'strengths', 'improvements']
        }
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini respondió ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini no devolvió JSON en la respuesta');
  }
  return JSON.parse(text);
}

/**
 * Clasificador de intención de conjunto CERRADO.
 *
 * La IA aquí ENTIENDE pero no decide nada peligroso: el responseSchema la
 * obliga a elegir una etiqueta de una lista fija (enum). No puede inventar un
 * procedimiento ni un comando — no hay ningún campo libre donde ponerlo. Si
 * no reconoce el caso, solo puede decir "ninguna" o "ambiguo", y entonces el
 * tutor PREGUNTA en vez de adivinar. Es la misma disciplina de siempre: la IA
 * entiende el lenguaje; el JS determinista decide el comando.
 *
 * @param {string[]} etiquetas  el conjunto cerrado de intenciones válidas
 * @returns {Promise<{intencion:string, confianza:string}>}
 */
export async function generateIntentClassification(apiKey, model, prompt, etiquetas) {
  const enumCerrado = [...etiquetas, 'ninguna', 'ambiguo'];
  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            intencion: { type: 'STRING', enum: enumCerrado },
            confianza: { type: 'STRING', enum: ['alta', 'media', 'baja'] }
          },
          required: ['intencion', 'confianza']
        }
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini respondió ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini no devolvió clasificación');
  return JSON.parse(text);
}

/**
 * Redacción del tutor.
 *
 * El responseSchema restringe la salida a DOS campos de texto. El modelo no
 * puede devolver un comando aunque quiera: no hay dónde ponerlo.
 */
export async function generateTutorText(apiKey, model, prompt) {
  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            explicacion: { type: 'STRING' },
            diagnostico: { type: 'STRING' }
          },
          required: ['explicacion', 'diagnostico']
        }
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini respondió ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini no devolvió JSON en la respuesta');
  return JSON.parse(text);
}

/**
 * Variantes que hablan con el PUENTE del servidor (Vertex de pago) en vez de
 * con Google directo. El navegador no lleva llave: solo manda el prompt a
 * hyntibia.com.co/api/gemini, y el puente usa la cuenta de servicio por detrás.
 * Mismas salidas estructuradas (el puente aplica el mismo responseSchema).
 */
export async function generateIntentClassificationServidor(endpoint, prompt, etiquetas) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, modo: 'clasificacion', etiquetas })
  });
  if (!res.ok) throw new Error(`puente clasificación ${res.status}`);
  return res.json(); // { intencion, confianza }
}

export async function generateTutorTextServidor(endpoint, prompt) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, modo: 'tutor' })
  });
  if (!res.ok) throw new Error(`puente tutor ${res.status}`);
  return res.json(); // { explicacion, diagnostico }
}

/**
 * FASE 1 · RAG — El "cerebro de preguntas". Manda la pregunta al puente en modo
 * 'pregunta': el servidor busca en el índice del manual y Vertex responde SOLO
 * con eso, citando la fuente. Para dudas de examen, PIDs, "¿qué es X?", etc.
 */
export async function preguntarServidor(endpoint, prompt) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, modo: 'pregunta' })
  });
  if (!res.ok) throw new Error(`puente pregunta ${res.status}`);
  return res.json(); // { explicacion, fuentes }
}

/**
 * FASE 3 · APRENDE CONTIGO — guarda un dato/corrección en tu memoria personal.
 * Manda la clave (X-Bot-Clave) porque escribir memoria exige estar tras la clave
 * del tutor: solo tú le enseñas, nada de aprendizaje anónimo envenenable.
 */
export async function aprenderServidor(endpoint, texto, claveHash) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Bot-Clave': claveHash || '' },
    body: JSON.stringify({ prompt: texto, modo: 'aprender' })
  });
  if (!res.ok) throw new Error(`puente aprender ${res.status}`);
  return res.json(); // { explicacion, aprendido }
}
