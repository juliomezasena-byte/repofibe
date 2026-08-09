import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let cachedJWKS = null;
function getJWKS() {
  if (!cachedJWKS) {
    cachedJWKS = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return cachedJWKS;
}

/**
 * Error de autenticación: lleva su propio código HTTP.
 *
 * Antes el enrutador clasificaba el error mirando su TEXTO con una expresión
 * regular. Un token que no es ni un JWT ("mock-token") hace que jose lance
 * "Invalid Compact JWS", que no casaba con ninguna palabra de la lista, así
 * que un fallo de credenciales se devolvía como 500 — un error del servidor
 * por algo que el servidor hizo bien al rechazar.
 */
export class ErrorDeAutenticacion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorDeAutenticacion';
    this.status = 401;
  }
}

export function assertValidClaims(payload, projectId) {
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;
  const now = Math.floor(Date.now() / 1000);

  if (payload.iss !== expectedIssuer) {
    throw new ErrorDeAutenticacion(`Issuer inválido: ${payload.iss}`);
  }
  if (payload.aud !== projectId) {
    throw new ErrorDeAutenticacion(`Audience inválido: ${payload.aud}`);
  }
  if (!payload.exp || payload.exp <= now) {
    throw new ErrorDeAutenticacion('Token expirado');
  }
  if (!payload.sub) {
    throw new ErrorDeAutenticacion('Token sin uid (sub)');
  }
}

export async function verifyFirebaseIdToken(idToken, projectId) {
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, getJWKS(), { algorithms: ['RS256'] }));
  } catch (err) {
    // Cualquier fallo de jose (firma, formato, caducidad) es un problema de
    // credenciales del cliente, no una avería del servidor: 401, no 500.
    throw new ErrorDeAutenticacion(`Token no válido: ${err.message}`);
  }
  assertValidClaims(payload, projectId);
  return { uid: payload.sub };
}
