const UPSTREAM = 'https://roleplay-iberia-worker.roleplay-worker.workers.dev/coach/publico';
const ALLOWED_ORIGIN = 'https://hyntibia.com.co';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Bot-Clave',
    'Vary': 'Origin'
  };
}

export default {
  async fetch(request) {
    const headers = corsHeaders();

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      return Response.json({ error: 'method_not_allowed' }, { status: 405, headers });
    }

    try {
      const upstream = await fetch(UPSTREAM, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': ALLOWED_ORIGIN,
          'X-Bot-Clave': request.headers.get('X-Bot-Clave') || ''
        },
        body: await request.text()
      });

      const responseHeaders = new Headers(headers);
      responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
      responseHeaders.set('Cache-Control', 'no-store');
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: responseHeaders
      });
    } catch (error) {
      console.error('coach proxy upstream unreachable', error);
      return Response.json({
        error: 'coach_unreachable',
        explicacion: 'No pude conectar con el tutor. Intenta de nuevo.'
      }, { status: 502, headers });
    }
  }
};
