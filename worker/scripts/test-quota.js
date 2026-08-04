import { checkAndConsumeQuota } from '../src/quota.js';

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}`);
    failed++;
  }
}

console.log('--- TEST RUNNER: quota ---');

function makeFakeKV(initial = {}) {
  const store = { ...initial };
  return {
    async get(key) {
      return store[key] ?? null;
    },
    async put(key, value) {
      store[key] = value;
    },
    _store: store
  };
}

async function run() {
  const kv = makeFakeKV();
  const day = '2026-08-03';

  const first = await checkAndConsumeQuota(kv, 'user-1', day, 2);
  check('primera llamada del día permitida', first.allowed === true);
  check('cuenta queda en 1 tras la primera llamada', kv._store['quota:user-1:2026-08-03'] === '1');

  const second = await checkAndConsumeQuota(kv, 'user-1', day, 2);
  check('segunda llamada permitida (límite es 2)', second.allowed === true);

  const third = await checkAndConsumeQuota(kv, 'user-1', day, 2);
  check('tercera llamada RECHAZADA (excede el límite de 2)', third.allowed === false);

  const otherUser = await checkAndConsumeQuota(kv, 'user-2', day, 2);
  check('otro usuario tiene su propia cuota independiente', otherUser.allowed === true);

  console.log(`\nResultados: ${passed} pasados, ${failed} fallidos.`);
  if (failed > 0) process.exit(1);
}

run();
