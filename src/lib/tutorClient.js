import { auth } from './firebase';

const WORKER_URL = import.meta.env.VITE_ROLEPLAY_WORKER_URL;

async function post(path, body) {
  let idToken = 'mock-token';
  if (import.meta.env.VITE_E2E_MOCK_AUTH !== '1') {
    if (!auth.currentUser) throw new Error('Debes iniciar sesión para usar el tutor.');
    idToken = await auth.currentUser.getIdToken(true);
  }

  const res = await fetch(`${WORKER_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // El worker desplegado puede ser anterior a /tutor/paso: hay que decirlo
    // claro en vez de soltar un "not_found" que no orienta a nadie.
    const mensaje = res.status === 404 && data.error === 'not_found'
      ? 'El tutor todavía no está publicado en el servidor. El resto de la app funciona con normalidad.'
      : data.error || `Error ${res.status}`;
    const error = new Error(mensaje);
    error.status = res.status;
    throw error;
  }
  return data;
}

/**
 * Pide el siguiente paso.
 *
 * Se le puede pasar `procedimientoId` (ya sabes qué manual toca) o `caso`
 * (que lo decida el árbol). Si el árbol necesita más datos, la respuesta
 * trae `decision.siguientePregunta` en vez de un paso.
 */
export function pedirPaso({ procedimientoId, caso, pasoActual, comandoEscrito, datos, nivel, conIA = true }) {
  return post('/tutor/paso', { procedimientoId, caso, pasoActual, comandoEscrito, datos, nivel, conIA });
}
