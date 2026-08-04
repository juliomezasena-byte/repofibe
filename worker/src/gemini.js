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
