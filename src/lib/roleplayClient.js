const WORKER_URL = import.meta.env.VITE_ROLEPLAY_WORKER_URL;

async function post(path, idToken, body) {
  const res = await fetch(`${WORKER_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error || `Error ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

export function sendTurn(idToken, scenarioId, history) {
  return post('/roleplay/turn', idToken, { scenarioId, history });
}

export function evaluateSession(idToken, scenarioId, transcript) {
  return post('/roleplay/evaluate', idToken, { scenarioId, transcript });
}
