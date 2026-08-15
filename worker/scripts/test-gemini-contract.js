import { validarRespuestaGemini } from '../src/validar-gemini.js';

let pasados = 0;
let fallos = 0;
function comprobar(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}: ${JSON.stringify(real)} != ${JSON.stringify(esperado)}`); }
}

console.log('\n--- CONTRATO DE GEMINI ---');
comprobar('acepta explicación sin comando', validarRespuestaGemini({ explicacion: 'Te falta elegir la clase.', diagnostico: '' }).ok, true);
comprobar('acepta el comando exacto del paso', validarRespuestaGemini({ explicacion: 'Ejecuta `SS 3 J 1`.', diagnostico: '' }, { comando: 'SS 3 J 1' }).ok, true);
comprobar('rechaza comando inventado', validarRespuestaGemini({ explicacion: 'Ejecuta `SS 4 Y 1`.', diagnostico: '' }, { comando: 'SS 3 J 1' }).ok, false);
comprobar('rechaza comando cuando no hay paso', validarRespuestaGemini({ explicacion: 'Usa `AN 11MAR MADBOG`.', diagnostico: '' }).ok, false);
comprobar('rechaza esquema incorrecto', validarRespuestaGemini({ explicacion: 4, diagnostico: '' }).ok, false);

console.log(`Resultados: ${pasados} pasados, ${fallos} fallidos.`);
process.exit(fallos ? 1 : 0);
