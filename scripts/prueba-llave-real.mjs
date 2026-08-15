/**
 * Prueba EN VIVO la IA cliente con una llave real de Gemini.
 * La llave se lee de la variable de entorno GEMINI_TEST_KEY — NUNCA se escribe
 * en disco ni se commitea. Uso: GEMINI_TEST_KEY="..." node scripts/prueba-llave-real.mjs
 */
import { responderLocal } from '../worker/src/tutor-local.js';

const key = process.env.GEMINI_TEST_KEY;
if (!key) { console.error('Falta GEMINI_TEST_KEY'); process.exit(1); }

const casos = [
  'cambiarle el nombre al pasajero porque quedó mal escrito',
  'el cliente quiere cambiar la fecha del vuelo',
  'el señor quiere que le devuelvan el dinero, ya no va a viajar'
];

for (const c of casos) {
  console.log('\n──────────────────────────────────────────');
  console.log('CASO:', c);
  try {
    const r = await responderLocal({ consulta: c, geminiKey: key, caso: {} });
    const intencion = r?.decision?.intencionActiva || r?.procedimientoId || '(ninguna)';
    console.log('  → intención IA:', intencion);
    const exp = (r?.explicacion || '').replace(/\n/g, '\n     ');
    console.log('  → respuesta:', exp.slice(0, 400));
  } catch (e) {
    console.log('  ✗ ERROR:', e.message.slice(0, 200));
  }
}
console.log('\n──────────────────────────────────────────');
