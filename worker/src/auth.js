import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let cachedJWKS = null;
function getJWKS() {
  if (!cachedJWKS) {
    cachedJWKS = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return cachedJWKS;
}

export function assertValidClaims(payload, projectId) {
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;
  const now = Math.floor(Date.now() / 1000);

  if (payload.iss !== expectedIssuer) {
    throw new Error(`Issuer inválido: ${payload.iss}`);
  }
  if (payload.aud !== projectId) {
    throw new Error(`Audience inválido: ${payload.aud}`);
  }
  if (!payload.exp || payload.exp <= now) {
    throw new Error('Token expirado');
  }
  if (!payload.sub) {
    throw new Error('Token sin uid (sub)');
  }
}

export async function verifyFirebaseIdToken(idToken, projectId) {
  const { payload } = await jwtVerify(idToken, getJWKS());
  assertValidClaims(payload, projectId);
  return { uid: payload.sub };
}
