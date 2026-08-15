#!/usr/bin/env node
import { leerPantalla, fusionarEnCaso } from '../src/pantalla.js';
import { queProcedimiento } from '../src/arbol.js';
import { responderCoachPublico } from '../src/publico.js';

let pasados = 0;
let fallos = 0;
function comprobar(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) { pasados++; console.log(`  [OK]   ${nombre}`); }
  else { fallos++; console.error(`  [FALLO] ${nombre}\n          esperado: ${JSON.stringify(esperado)}\n          real:     ${JSON.stringify(real)}`); }
}

const AN_MADBOG = `** IBERIA - AN ** BOG BOGOTA.CO 213 TH 11MAR 0000
1 IB 155 J9 C9 D9 R9 I9 U1 W9 /MAD4S BOG 1 0010 0440 E0/350 10:30
E9 T9 P2 Y9 B9 H9 K9 M9 L9 F9 V9 S9 G8 Z9 N9 Q9 O9 A9 X8
2 IB 151 J9 C9 D9 R9 I9 W9 E9 /MAD4S BOG 1 1210 1635 E0/350 10:25
T9 P1 Y9 B9 H9 K9 M9 L9 F9 V9 S9 G8 Z9 N9 Q9 O9 A9 X8`;

console.log('\n--- LEE LA DISPONIBILIDAD REAL ---');
const lectura = leerPantalla(AN_MADBOG);
comprobar('reconoce una AN', lectura.tipo, 'disponibilidad');
comprobar('lee las dos lÃ­neas de vuelo', lectura.disponibilidad?.vuelos.length, 2);
comprobar('lee la ruta de la primera lÃ­nea', lectura.disponibilidad?.vuelos[0]?.origen + lectura.disponibilidad?.vuelos[0]?.destino, 'MADBOG');
comprobar('conserva la clase J disponible', lectura.disponibilidad?.vuelos[0]?.clases.some((c) => c.clase === 'J' && c.cupos === 9), true);

console.log('\n--- EL ÃRBOL USA LA PANTALLA, NO LA IGNORA ---');
const caso = fusionarEnCaso({
  intencion: 'emision',
  pasajeros: { ADT: 2, CHD: 1, INF: 1, plazas: 3, total: 4 }
}, lectura);
const primera = queProcedimiento(caso);
comprobar('pide la lÃ­nea visible, no repite AN', primera.siguientePregunta?.id, 'lineaVuelo');
comprobar('calcula tres plazas para 2 ADT + 1 CHD + 1 INF', primera.avisos.some((a) => /3 plazas/.test(a)), true);
comprobar('la opciÃ³n conserva las plazas entre turnos', primera.siguientePregunta?.opciones[0]?.valor, '1|3');

const segunda = queProcedimiento({ ...caso, respuestas: { lineaVuelo: '1|3' } });
comprobar('tras elegir lÃ­nea pide la clase de ESA lÃ­nea', segunda.siguientePregunta?.id, 'clase');
comprobar('ofrece J de la lÃ­nea 1', segunda.siguientePregunta?.opciones.some((o) => o.valor === 'J'), true);

console.log('\n--- EL HANDLER LLEGA AL COMANDO SITUADO ---');
const inicio = await responderCoachPublico({
  consulta: 'necesito crear reserva de 2 ADT - 1 CHD - 1 INF, guÃ­ame',
  caso: { pantallas: [AN_MADBOG] },
  conIA: false
}, {});
comprobar('el mensaje real detecta emisiÃ³n', inicio.decision?.intencionActiva, 'emision');
comprobar('el mensaje real reconoce la AN pegada', inicio.lectura?.tipo, 'disponibilidad');
comprobar('el mensaje real pregunta la lÃ­nea, no lo genÃ©rico', inicio.decision?.siguientePregunta?.id, 'lineaVuelo');
comprobar('el mensaje real explica las tres plazas', /3 plazas/.test(inicio.explicacion || ''), true);

const final = await responderCoachPublico({
  caso: {
    intencion: 'emision',
    pantallas: [AN_MADBOG],
    respuestas: { lineaVuelo: '1|3', clase: 'J' }
  },
  conIA: false
}, {});
comprobar('salta la AN ya pegada', final.paso?.n, 2);
comprobar('propone exactamente SS 3 J 1', final.paso?.comando, 'SS 3 J 1');

console.log('\n--- CONVERSACIÓN LIBRE: NO ES UN IVR ---');
const textoLinea = await responderCoachPublico({
  consulta: 'quiero vender la línea 1',
  caso: { intencion: 'emision', pasajeros: { ADT: 2, CHD: 1, INF: 1, plazas: 3, total: 4 }, pantallas: [AN_MADBOG] },
  conIA: false
}, {});
comprobar('entiende una respuesta escrita', textoLinea.decision?.respuestaExtraida?.id, 'lineaVuelo');
comprobar('guarda la línea entendida', textoLinea.decision?.respuestasActivas?.lineaVuelo, '1|3');
comprobar('pasa a preguntar la clase', textoLinea.decision?.siguientePregunta?.id, 'clase');

const textoClase = await responderCoachPublico({
  consulta: 'la J está bien',
  caso: {
    intencion: 'emision',
    pasajeros: textoLinea.decision.pasajerosActivos,
    pantallas: [AN_MADBOG],
    respuestas: { lineaVuelo: textoLinea.decision.respuestasActivas.lineaVuelo }
  },
  conIA: false
}, {});
comprobar('entiende la clase escrita', textoClase.decision?.respuestaExtraida?.id, 'clase');
comprobar('llega al paso manual sin botones', textoClase.paso?.comando, 'SS 3 J 1');

console.log('\n' + '='.repeat(50));
console.log(`Resultados: ${pasados} pasados, ${fallos} fallidos.`);
console.log('='.repeat(50) + '\n');
process.exit(fallos ? 1 : 0);
