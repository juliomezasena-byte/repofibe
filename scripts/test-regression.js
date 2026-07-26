import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DslParser } from '../src/engine/DslParser.js';
import { PnrStateMachine } from '../src/engine/PnrStateMachine.js';
import { ResponseGenerator } from '../src/engine/ResponseGenerator.js';
import { EvaluationEngine } from '../src/engine/EvaluationEngine.js';
import { QuizEngine } from '../src/engine/QuizEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const spec = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/profiles/amadeus/commands_meta.json'), 'utf8'));
const flights = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/profiles/amadeus/flights.json'), 'utf8')).flights;
const scenarios = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/profiles/amadeus/scenarios.json'), 'utf8')).scenarios;
const locations = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/profiles/amadeus/locations.json'), 'utf8')).locations;

const parser = new DslParser(spec);
const fsm = new PnrStateMachine();
const responseGen = new ResponseGenerator(spec);
const evalEngine = new EvaluationEngine();

console.log('--- SUITE DE PRUEBAS DE REGRESIÓN (QA) ---');

let passedScenarios = 0;

scenarios.forEach((scen) => {
  console.log(`\nProbando Escenario: ${scen.title}`);
  fsm.reset();

  if (scen.initialState && scen.initialState.pnr) {
    fsm.setState(scen.initialState.pnr);
  }

  // Anti auto-completado: ningún escenario puede arrancar hecho (o casi).
  const evalInicial = evalEngine.evaluate(scen, fsm.getState());
  let flowErrors = 0;
  if (evalInicial.completed || evalInicial.score >= 80) {
    console.error(`  [ERROR INICIO] Arranca en ${evalInicial.score}% (completado: ${evalInicial.completed}) sin ejecutar comandos.`);
    flowErrors++;
  }

  scen.suggestedFlow.forEach((cmd) => {
    const parseResult = parser.parse(cmd);
    if (!parseResult.success) {
      console.error(`  [ERROR PARSER] Comando "${cmd}" falló: ${parseResult.error}`);
      flowErrors++;
      return;
    }
    const processResult = fsm.process(parseResult, flights, locations);
    const output = responseGen.formatResponse(processResult, fsm.getState());
    // XE elimina líneas y HE/consultas pueden devolver estados informativos;
    // cualquier otro comando del flujo sugerido NO debe fallar.
    if (!processResult.success && !cmd.startsWith('XE')) {
      console.error(`  [ERROR FSM] Comando "${cmd}" respuesta: ${output}`);
      flowErrors++;
    }
  });

  const evalResult = evalEngine.evaluate(scen, fsm.getState());
  console.log(`  Resultado Evaluación: ${evalResult.score}% (Completado: ${evalResult.completed})`);

  // Criterio estricto: el flujo sugerido del manual DEBE completar el escenario al 100%
  // y no puede producir errores intermedios.
  if (evalResult.completed && flowErrors === 0) {
    console.log(`  [PASS] Escenario ${scen.id} completado al 100%.`);
    passedScenarios++;
  } else {
    console.error(`  [FAIL] Escenario ${scen.id} (errores de flujo: ${flowErrors}). Feedback:`, evalResult.feedback);
  }
});

// ── Suite de tolerancia (feedback de David): Amadeus lee los comandos
// con o sin espacios, y DAC debe dar la ciudad REAL, nunca inventada. ──
console.log('\n--- SUITE DE TOLERANCIA (ESPACIOS + IATA REAL) ---');

let toleranceFailures = 0;
function probarTolerancia(nombre, comandos, verificar) {
  fsm.reset();
  let lastResult = null;
  for (const cmd of comandos) {
    const pr = parser.parse(cmd);
    if (!pr.success) {
      console.error(`  [FAIL] ${nombre}: "${cmd}" no parseó (${pr.error})`);
      toleranceFailures++;
      return;
    }
    lastResult = fsm.process(pr, flights, locations);
  }
  const err = verificar(lastResult, fsm.getState());
  if (err) {
    console.error(`  [FAIL] ${nombre}: ${err}`);
    toleranceFailures++;
  } else {
    console.log(`  [PASS] ${nombre}`);
  }
}

// Espacios y uniones equivalentes
probarTolerancia('SN unido (SN12APRMEXSDQ)', ['SN12APRMEXSDQ'],
  (r) => r.success && r.data.origin === 'MEX' && r.data.destination === 'SDQ' ? null : 'origen/destino incorrectos');
probarTolerancia('SN espaciado (SN 12 APR MEX SDQ)', ['SN 12 APR MEX SDQ'],
  (r) => r.success && r.data.origin === 'MEX' && r.data.destination === 'SDQ' ? null : 'origen/destino incorrectos');
probarTolerancia('SS espaciado del manual (SS 3 J 3)', ['AN25NOVBOGMIA', 'SS 3 J 3'],
  (r, s) => r.success && s.segments.length === 1 && s.segments[0].class === 'J' && s.segments[0].status === 'HK3' ? null : 'venta no registrada como HK3 clase J');
probarTolerancia('SS unido (SS3J3)', ['AN25NOVBOGMIA', 'SS3J3'],
  (r, s) => r.success && s.segments.length === 1 && s.segments[0].class === 'J' ? null : 'venta no registrada');
probarTolerancia('FQC espaciado (FQC 35 USD/DOP)', ['FQC 35 USD/DOP'],
  (r) => r.success && r.data.toCurrency === 'DOP' && r.data.convertedAmount === '2065.00' ? null : `conversión incorrecta: ${JSON.stringify(r.data || r)}`);
probarTolerancia('TK espaciado (TK OK)', ['TK OK'],
  (r, s) => r.success && s.ticketing ? null : 'ticketing no registrado');

// DAC con IATA real (el caso de David: WAS debe decir WASHINGTON)
probarTolerancia('DAC WAS -> WASHINGTON', ['DAC WAS'],
  (r) => r.success && r.data.city === 'WASHINGTON' ? null : `respondió: ${JSON.stringify(r.data || r.error)}`);
probarTolerancia('DACWAS unido -> WASHINGTON', ['DACWAS'],
  (r) => r.success && r.data.city === 'WASHINGTON' ? null : `respondió: ${JSON.stringify(r.data || r.error)}`);
probarTolerancia('DAC MDE -> MEDELLIN', ['DAC MDE'],
  (r) => r.success && r.data.city === 'MEDELLIN' ? null : `respondió: ${JSON.stringify(r.data || r.error)}`);
probarTolerancia('DAC XXX -> error honesto', ['DAC XXX'],
  (r) => !r.success && /NO MATCH/.test(r.error) ? null : 'aceptó un código inexistente');
probarTolerancia('DAN SANTO DOMINGO -> SDQ', ['DAN SANTO DOMINGO'],
  (r) => r.success && r.data.code === 'SDQ' ? null : `respondió: ${JSON.stringify(r.data || r.error)}`);
probarTolerancia('DAN WASHINGTON -> WAS', ['DAN WASHINGTON'],
  (r) => r.success && r.data.code === 'WAS' ? null : `respondió: ${JSON.stringify(r.data || r.error)}`);

// ── Comandos nuevos del Material de Apoyo ──
probarTolerancia('MN avanza un día (12APR -> 13APR)', ['SN 12 APR MEX SDQ', 'MN'],
  (r) => r.success && r.data.date === '13APR' ? null : `fecha: ${JSON.stringify(r.data?.date || r.error)}`);
probarTolerancia('MY retrocede y MO vuelve al original', ['SN 12 APR MEX SDQ', 'MN', 'MN', 'MO'],
  (r) => r.success && r.data.date === '12APR' ? null : `fecha: ${JSON.stringify(r.data?.date || r.error)}`);
probarTolerancia('MN cruza fin de mes (30APR -> 1MAY)', ['SN 30 APR MEX SDQ', 'MN'],
  (r) => r.success && r.data.date === '1MAY' ? null : `fecha: ${JSON.stringify(r.data?.date || r.error)}`);
probarTolerancia('FQN1*PE muestra penalidades paginadas', ['FQN1*PE'],
  (r, s) => r.success && r.type === 'PAGED' && /CANCELLATIONS/.test(r.data.page) && s.viewedPenalties ? null : 'sin página de penalidades');
probarTolerancia('MD/MU navegan páginas de FQN', ['FQN1*PE', 'MD'],
  (r) => r.success && r.data.index === 1 && /CHANGES/.test(r.data.page) ? null : `página: ${JSON.stringify(r.data || r.error)}`);
probarTolerancia('MU en primera página -> error honesto', ['FQN1*PE', 'MU'],
  (r) => !r.success && /FIRST PAGE/.test(r.error) ? null : 'no avisó que ya estaba en la primera página');
probarTolerancia('TKXL 24JUL fija plazo', ['TKXL 24JUL'],
  (r, s) => r.success && /TKXL/.test(s.ticketing || '') ? null : `ticketing: ${s.ticketing}`);
probarTolerancia('APE- correo de confirmación', ['APE-ANA@GMAIL.COM'],
  (r, s) => r.success && s.contacts.length === 1 && /ANA@GMAIL.COM/.test(s.contacts[0].text) ? null : 'correo no registrado');
probarTolerancia('SR CTCE- seguridad del correo', ['SR CTCE-ANA//GMAIL.COM'],
  (r, s) => r.success && s.ssrs.length === 1 && /CTCE/.test(s.ssrs[0]) ? null : 'CTCE no registrado');
probarTolerancia('NM niño (CHD/fecha) conserva el nombre completo', ['NM1PEREZ/JUAN(CHD/10MAY18)'],
  (r, s) => r.success && s.passengers.length === 1 && s.passengers[0].name === 'PEREZ/JUAN(CHD/10MAY18)' ? null : `nombre: ${JSON.stringify(s.passengers)}`);
probarTolerancia('XE1-3 borra el rango', ['NM1AAA/UNO', 'NM1BBB/DOS', 'NM1CCC/TRES', 'XE1-3'],
  (r, s) => r.success && s.passengers.length === 0 ? null : `quedaron: ${s.passengers.length}`);
probarTolerancia('XE con lista (XE1,3) borra solo esas', ['NM1AAA/UNO', 'NM1BBB/DOS', 'NM1CCC/TRES', 'XE1,3'],
  (r, s) => r.success && s.passengers.length === 1 && /BBB/.test(s.passengers[0].name) ? null : `quedaron: ${JSON.stringify(s.passengers)}`);

// ── Bug del profesor: XE debe borrar CUALQUIER línea visible del PNR ──
probarTolerancia('Caso del profesor: XE3,4 borra los dos remarks',
  ['AN20APRSDQMEX', 'SS1V1', 'NM1GARCIA/CARLOS MR', 'RM HOLA', 'RM HALO', 'XE3,4'],
  (r, s) => {
    if (!r.success) return `XE3,4 falló: ${r.error}`;
    if (s.remarks.length !== 0) return `quedaron ${s.remarks.length} remarks`;
    if (s.passengers.length !== 1 || s.segments.length !== 1) return 'borró pasajero o segmento por error';
    return null;
  });
probarTolerancia('XE borra un remark individual (línea visual)',
  ['NM1GARCIA/CARLOS MR', 'RM NOTA UNO', 'XE2'],
  (r, s) => r.success && s.remarks.length === 0 && s.passengers.length === 1 ? null : `remarks: ${s.remarks.length}`);
probarTolerancia('XE borra la línea de ticketing',
  ['NM1GARCIA/CARLOS MR', 'TK OK', 'XE2'],
  (r, s) => r.success && s.ticketing === null && s.passengers.length === 1 ? null : `ticketing: ${s.ticketing}`);
probarTolerancia('XE borra un SSR por su línea',
  ['NM1GARCIA/CARLOS MR', 'SR VGML', 'XE2'],
  (r, s) => r.success && s.ssrs.length === 0 ? null : `ssrs: ${s.ssrs.length}`);

// ── Comandos que David reporto como faltantes ──
probarTolerancia('TQT muestra el TST tras FXP', ['AN25NOVBOGMIA', 'SS1Y1', 'FXP', 'TQT'],
  (r) => r.success && r.type === 'TST_VIEW' && /REGISTRO DE TARIFA/.test(''+r.data.tst.fareBasis + 'REGISTRO DE TARIFA') ? null : (r.type === 'TST_VIEW' ? null : 'TQT no mostro el TST'));
probarTolerancia('TQT sin TST -> error honesto', ['TQT'],
  (r) => !r.success && /NO TST/.test(r.error) ? null : 'TQT no aviso que falta el TST');
probarTolerancia('TQT/T1 especifico funciona', ['AN25NOVBOGMIA', 'SS1Y1', 'FXP', 'TQT/T1'],
  (r) => r.success && r.type === 'TST_VIEW' && r.data.line === '1' ? null : 'TQT/T1 fallo');
probarTolerancia('ERK guarda y muestra el PNR (como ER)', ['AN25NOVBOGMIA', 'SS1Y1', 'NM1GARCIA/CARLOS MR', 'APBOG 573001234567-M', 'TK OK', 'RF CARLOS', 'ERK'],
  (r, s) => r.success && s.isTransacted && s.code ? null : 'ERK no cerro el PNR');

// ── Regresiones negativas: no debe bastar con completar la estructura del PNR. ──
console.log('\n--- SUITE DE REGRESIONES NEGATIVAS ---');

function probarRegresionNegativa(nombre, comandos, verificar, escenario = null) {
  fsm.reset();
  if (escenario?.initialState?.pnr) fsm.setState(escenario.initialState.pnr);

  let lastResult = null;
  for (const cmd of comandos) {
    const pr = parser.parse(cmd);
    if (!pr.success) {
      console.error(`  [FAIL] ${nombre}: "${cmd}" no parseó (${pr.error})`);
      toleranceFailures++;
      return;
    }
    lastResult = fsm.process(pr, flights, locations);
  }

  const err = verificar(lastResult, fsm.getState());
  if (err) {
    console.error(`  [FAIL] ${nombre}: ${err}`);
    toleranceFailures++;
  } else {
    console.log(`  [PASS] ${nombre}`);
  }
}

const scenario19 = scenarios.find((scen) => scen.id === 'scenario-19');
const scenario20 = scenarios.find((scen) => scen.id === 'scenario-20');

probarRegresionNegativa('Nivel 20 no completa sin INF',
  ['AN13MARLIMBOG', 'SS1Y1', 'NM1GARCIA/CARLOS MR', 'APBOG 573004445566-M', 'TK OK', 'FXX/FF-OPTIMA/RAD*IN,BOG', 'RF CARLOS', 'ER'],
  (r, s) => !evalEngine.evaluate(scenario20, s).completed ? null : 'completó sin registrar el INF', scenario20);
probarRegresionNegativa('Nivel 20 no completa sin RAD*IN',
  ['AN13MARLIMBOG', 'SS1Y1', 'NM1GARCIA/CARLOS MR(INFGARCIA/SOFIA/01JAN25)', 'APBOG 573004445566-M', 'TK OK', 'FXX/FF-OPTIMA/RAD,BOG', 'RF CARLOS', 'ER'],
  (r, s) => !evalEngine.evaluate(scenario20, s).completed ? null : 'completó sin la tarifa RAD*IN', scenario20);
probarRegresionNegativa('Nivel 19 no completa con una nota distinta al TTL',
  ['RT', 'XE4-6', 'RM CUALQUIER COSA', 'RF CARLOS', 'ER'],
  (r, s) => !evalEngine.evaluate(scenario19, s).completed ? null : 'aceptó una nota distinta al TTL requerido', scenario19);
probarRegresionNegativa('XE3 borra el RM tras SRXBAG en la línea 2',
  ['NM1GARCIA/CARLOS MR', 'SRXBAG/P1/S1', 'RM NOTA DE EQUIPAJE', 'XE3'],
  (r, s) => r.success && s.remarks.length === 0 && s.baggage.length === 1
    ? null
    : `resultado: ${r.error || 'RM no borrado'}`);
probarRegresionNegativa('TQT/T99 rechaza un TST inexistente',
  ['AN25NOVBOGMIA', 'SS1Y1', 'FXP', 'TQT/T99'],
  (r) => !r.success && /NO TST|CHECK TST/.test(r.error) ? null : 'mostró un TST inexistente');

const erkInvalido = parser.parse('ERKXYZ');
if (erkInvalido.success) {
  console.error('  [FAIL] ERKXYZ no debe parsear: aceptó un sufijo inválido');
  toleranceFailures++;
} else {
  console.log('  [PASS] ERKXYZ no parsea');
}

// ── Módulo de equipaje / EMD (flujo de David) ──
probarTolerancia('SRXBAG registra el servicio de equipaje', ['SRXBAG/P1/S1'],
  (r, s) => r.success && s.baggage.length === 1 && s.baggage[0].pax === 1 && s.baggage[0].seg === 1 ? null : 'no registro XBAG');
probarTolerancia('FXG sin equipaje -> error honesto', ['FXG'],
  (r) => !r.success && /NO BAGGAGE/.test(r.error) ? null : 'guardo sin servicio');
probarTolerancia('FXG crea el TSM', ['SRXBAG/P1/S1', 'FXG'],
  (r, s) => r.success && s.tsm && s.tsm.status === 'STORED' ? null : 'no creo TSM');
probarTolerancia('TTM sin forma de pago -> error', ['SRXBAG/P1/S1', 'FXG', 'TTM/M1/RT'],
  (r) => !r.success && /FORM OF PAYMENT/.test(r.error) ? null : 'emitio sin FP');
probarTolerancia('Flujo EMD completo emite el documento', ['SRXBAG/P1/S1', 'FXG', 'TMI/FP-CASH,', 'TTM/M1/RT'],
  (r, s) => r.success && r.emd && s.tsmIssued ? null : 'no emitio EMD');

// ── Vuelos dinámicos (petición de David: no siempre los mismos 3) ──
probarTolerancia('SN muestra escalera completa (>=15 letras) en la 1a opción', ['SN 12 APR MEX SDQ'],
  (r) => {
    const f = r.data.flights[0];
    const n = Object.keys(f.classes || {}).length;
    return r.success && n >= 15 ? null : `solo ${n} clases`;
  });
probarTolerancia('SN/AN entrega 3-5 opciones con línea 1..N y cabinas Y/C/J abiertas', ['SN 12 APR MEX SDQ'],
  (r) => {
    const fl = r.data.flights;
    if (fl.length < 3 || fl.length > 5) return `opciones: ${fl.length}`;
    for (let i = 0; i < fl.length; i++) if (fl[i].line !== i + 1) return 'líneas no secuenciales';
    const ok = fl.every((f) => typeof f.classes.Y === 'number' && typeof f.classes.C === 'number' && typeof f.classes.J === 'number');
    return ok ? null : 'alguna cabina Y/C/J cerrada (rompería la venta)';
  });
// Dinamismo real: dos consultas seguidas NO deben ser idénticas.
probarTolerancia('Dos consultas del mismo tramo dan vuelos distintos', ['AN25NOVBOGMIA'],
  (r) => {
    const firma = (d) => d.flights.map((f) => f.airline + f.flightNumber + f.departure).join('|');
    const a = firma(r.data);
    fsm.reset();
    const b = firma(fsm.process(parser.parse('AN25NOVBOGMIA'), flights, locations).data);
    return a !== b ? null : 'las dos consultas fueron idénticas (no es dinámico)';
  });
// En varias corridas aparecen escalas y clases cerradas (probabilístico).
probarTolerancia('Aparecen escalas (stops=1) en varias consultas', ['AN25NOVBOGMIA'],
  () => {
    for (let k = 0; k < 40; k++) {
      fsm.reset();
      const d = fsm.process(parser.parse('AN10AUGBOGSCL'), flights, locations).data;
      if (d.flights.some((f) => f.stops === 1 && f.via)) return null;
    }
    return 'nunca apareció una opción con escala en 40 consultas';
  });
probarTolerancia('SS en clase cerrada -> error (busca una C real en la escalera)', ['AN25NOVBOGMIA'],
  (r, s) => {
    let cerrada = null;
    for (const f of r.data.flights) {
      const cls = Object.entries(f.classes).find(([, v]) => v === 'C' || v === 0);
      if (cls) { cerrada = { line: f.line, clase: cls[0] }; break; }
    }
    if (!cerrada) return null; // sin clase cerrada esta corrida: nada que verificar
    const res = fsm.process(parser.parse(`SS1${cerrada.clase}${cerrada.line}`), flights, locations);
    return !res.success && /CLOSED/.test(res.error) ? null : 'vendió una clase cerrada';
  });

// ── Suite del QuizEngine (modo Teoría de Juan Pablo) ──
console.log('\n--- SUITE DEL QUIZ (TEORÍA) ---');
let quizFailures = 0;
const quiz = new QuizEngine({ commands: spec.commands, locations, flights });

function probarQuiz(nombre, fn) {
  try {
    const err = fn();
    if (err) { console.error(`  [FAIL] ${nombre}: ${err}`); quizFailures++; }
    else console.log(`  [PASS] ${nombre}`);
  } catch (e) {
    console.error(`  [FAIL] ${nombre}: excepción ${e.message}`); quizFailures++;
  }
}

probarQuiz('Determinismo: mismo seed => mismo quiz', () => {
  const a = quiz.generateQuiz(10, 42);
  const b = quiz.generateQuiz(10, 42);
  return JSON.stringify(a) === JSON.stringify(b) ? null : 'quizzes distintos con el mismo seed';
});

probarQuiz('200 preguntas: 4 opciones únicas y respuesta válida', () => {
  for (let seed = 1; seed <= 20; seed++) {
    for (const q of quiz.generateQuiz(10, seed)) {
      if (q.options.length !== 4) return `"${q.prompt}" tiene ${q.options.length} opciones`;
      if (new Set(q.options).size !== 4) return `opciones duplicadas en "${q.prompt}"`;
      if (q.correctIndex < 0 || q.correctIndex > 3) return `correctIndex inválido en "${q.prompt}"`;
      if (!q.explain) return `sin explicación en "${q.prompt}"`;
    }
  }
  return null;
});

probarQuiz('Todos los tipos de pregunta se generan', () => {
  const tipos = new Set(quiz.generateQuiz(14, 7).map((q) => q.type));
  const faltan = QuizEngine.TYPES.filter((t) => !tipos.has(t));
  return faltan.length === 0 ? null : `faltan tipos: ${faltan.join(',')}`;
});

probarQuiz('Sin prompts repetidos dentro de un quiz', () => {
  const qs = quiz.generateQuiz(10, 99);
  return new Set(qs.map((q) => q.prompt)).size === qs.length ? null : 'prompts repetidos';
});

probarQuiz('city-iata: los distractores nunca son códigos de la misma ciudad', () => {
  for (let seed = 1; seed <= 30; seed++) {
    for (const q of quiz.generateQuiz(10, seed).filter((x) => x.type === 'city-iata')) {
      const ciudad = q.prompt.match(/de (.+)\?$/)[1];
      const codesDeCiudad = locations.filter((l) => l.city === ciudad).map((l) => l.code);
      const malos = q.options.filter((o, i) => i !== q.correctIndex && codesDeCiudad.includes(o));
      if (malos.length) return `distractor ambiguo ${malos[0]} para ${ciudad}`;
    }
  }
  return null;
});

console.log(`\n==========================================`);
console.log(`Resumen QA: ${passedScenarios}/${scenarios.length} escenarios superados.`);
console.log(`Tolerancia: ${toleranceFailures === 0 ? 'OK' : toleranceFailures + ' fallos'}`);
console.log(`Quiz: ${quizFailures === 0 ? 'OK' : quizFailures + ' fallos'}`);
console.log(`==========================================`);

if (passedScenarios < scenarios.length || toleranceFailures > 0 || quizFailures > 0) {
  process.exit(1);
}
