import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DslParser } from '../src/engine/DslParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const specPath = path.join(__dirname, '../public/profiles/amadeus/commands_meta.json');
const rawSpec = fs.readFileSync(specPath, 'utf8');
const spec = JSON.parse(rawSpec);

const parser = new DslParser(spec);

const testCases = [
  { input: 'AN25NOVBOGMIA', expectedCode: 'AN', expectedHandler: 'QUERY_AVAILABILITY' },
  { input: 'SS1Y1', expectedCode: 'SS', expectedHandler: 'SELL_SEGMENT' },
  { input: 'NM1GARCIA/CARLOS MR', expectedCode: 'NM', expectedHandler: 'ADD_NAME' },
  { input: 'APBOG 573001234567-M', expectedCode: 'AP', expectedHandler: 'ADD_CONTACT' },
  { input: 'TK OK', expectedCode: 'TK', expectedHandler: 'SET_TICKETING' },
  { input: 'RF CARLOS', expectedCode: 'RF', expectedHandler: 'SET_RECEIVED_FROM' },
  { input: 'ER', expectedCode: 'ER', expectedHandler: 'END_AND_REDISPLAY' },
  { input: 'FXP', expectedCode: 'FXP', expectedHandler: 'PRICE_AND_STORE' },
  { input: 'HE AN', expectedCode: 'HE', expectedHandler: 'SHOW_HELP' }
];

let passed = 0;
let failed = 0;

console.log('--- TEST RUNNER: DslParser ---');

testCases.forEach(({ input, expectedCode, expectedHandler }) => {
  const result = parser.parse(input);
  if (result.success && result.code === expectedCode && result.handler === expectedHandler) {
    console.log(`[PASS] "${input}" -> Code: ${result.code}, Handler: ${result.handler}`);
    passed++;
  } else {
    console.error(`[FAIL] "${input}" -> Result:`, result);
    failed++;
  }
});

console.log(`\nResultados: ${passed} pasados, ${failed} fallidos.`);
if (failed > 0) {
  process.exit(1);
}
