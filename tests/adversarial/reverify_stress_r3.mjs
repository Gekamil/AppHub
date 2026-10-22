/**
 * reverify_stress_r3.mjs
 * Comprehensive Empirical Adversarial Stress Harness for Milestone R3 Verification
 * Targets: newsService.js (weight coercion), aiOrganizer.js (intent & anti-hijacking), whatsapp-bridge.js
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Global mock environment for newsService
const mockStorage = {};
globalThis.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(mockStorage, k) ? mockStorage[k] : null),
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
};
globalThis.window = {
  dispatchEvent: () => {},
};
globalThis.CustomEvent = class CustomEvent {
  constructor(name, options = {}) {
    this.type = name;
    this.detail = options.detail || null;
  }
};

// Import newsService
const {
  FALLBACK_NEWS,
  getNewsPreferences,
  recordSwipe,
  resetNewsPreferences,
  getPersonalizedNews,
} = await import('../../src/services/newsService.js');

// Extract resolveAICopilotLocally from aiOrganizer.js for isolated Node testing
const aiOrganizerPath = path.join(PROJECT_ROOT, 'src/services/aiOrganizer.js');
const aiCode = fs.readFileSync(aiOrganizerPath, 'utf-8');
const resolveLocalMatch = aiCode.match(/export\s+function\s+resolveAICopilotLocally\s*\([\s\S]*?\n\}/);

if (!resolveLocalMatch) {
  throw new Error('Could not find resolveAICopilotLocally in src/services/aiOrganizer.js');
}

const aiHarnessCode = `
  const getCalendarReference = () => ({
    todayYmd: '2026-10-22',
    dayOfWeek: 'Jueves',
    calendarTableText: ''
  });
  const getUserCalendars = () => [
    { id: 'cal-default', name: 'Personal & General' },
    { id: 'cal-university', name: 'Universidad & Estudios' },
    { id: 'cal-health', name: 'Salud & Deporte' },
    { id: 'cal-work', name: 'Trabajo & Proyectos' }
  ];
  const getCurrentUser = () => ({ uid: 'test-student' });
  const resolveTaskCalendar = (t) => ({ id: 'cal-default', name: 'General' });
  const isEventFinished = () => false;
  const addDays = (d, n) => d;
  const parseScheduleLocalHeuristics = () => null;

  ${resolveLocalMatch[0].replace('export function resolveAICopilotLocally', 'function resolveAICopilotLocally')}
  return resolveAICopilotLocally;
`;
const resolveAICopilotLocally = new Function(aiHarnessCode)();

// Extract whatsapp-bridge functions
const whatsappBridgePath = path.join(PROJECT_ROOT, 'server/whatsapp-bridge.js');
const whatsappCode = fs.readFileSync(whatsappBridgePath, 'utf-8');

const formatNewsMatch = whatsappCode.match(/export\s+function\s+formatNewsForWhatsApp\s*\([\s\S]*?\n\}/);
const formatNewsForWhatsApp = new Function(`
  const FALLBACK_NEWS = ${JSON.stringify(FALLBACK_NEWS)};
  ${formatNewsMatch[0].replace('export function formatNewsForWhatsApp', 'function formatNewsForWhatsApp')}
  return formatNewsForWhatsApp;
`)();

const classifyMatch = whatsappCode.match(/export\s+function\s+classifyWhatsAppNewsQuery\s*\([\s\S]*?\n\}/);
const classifyWhatsAppNewsQuery = new Function(`
  ${classifyMatch[0].replace('export function classifyWhatsAppNewsQuery', 'function classifyWhatsAppNewsQuery')}
  return classifyWhatsAppNewsQuery;
`)();

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    failures.push({ name, error: err.message });
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    failures.push({ name, error: err.message });
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('==============================================================================');
console.log('  EMPIRICAL ADVERSARIAL STRESS SUITE — RE-VERIFICATION R3');
console.log('==============================================================================\n');

// ----------------------------------------------------------------------------
// Suite 1: newsService Weight Coercion & Boundary Stress
// ----------------------------------------------------------------------------
console.log('▶ Suite 1: newsService.js Weight Coercion & Resilience');

runTest('1.1: null weight coercion falls back to neutral 1.0', () => {
  localStorage.setItem('studenthub_news_preferences', JSON.stringify({
    weights: { technology: null, ai: null, science: null }
  }));
  const prefs = getNewsPreferences();
  assert.equal(prefs.weights.technology, 1.0, `Expected 1.0, got ${prefs.weights.technology}`);
  assert.equal(prefs.weights.ai, 1.0);
  assert.equal(prefs.weights.science, 1.0);
});

runTest('1.2: boolean false and true weights fall back to neutral 1.0', () => {
  localStorage.setItem('studenthub_news_preferences', JSON.stringify({
    weights: { technology: false, ai: true }
  }));
  const prefs = getNewsPreferences();
  assert.equal(prefs.weights.technology, 1.0);
  assert.equal(prefs.weights.ai, 1.0);
});

runTest('1.3: empty string "" weight falls back to neutral 1.0', () => {
  localStorage.setItem('studenthub_news_preferences', JSON.stringify({
    weights: { technology: '', productivity: '' }
  }));
  const prefs = getNewsPreferences();
  assert.equal(prefs.weights.technology, 1.0);
  assert.equal(prefs.weights.productivity, 1.0);
});

runTest('1.4: numeric strings and positive boundary values clamp correctly', () => {
  localStorage.setItem('studenthub_news_preferences', JSON.stringify({
    weights: {
      technology: '2.1',
      ai: 999.99,
      science: 0.15,
      productivity: 1.85,
    }
  }));
  const prefs = getNewsPreferences();
  assert.equal(prefs.weights.technology, 2.1);
  assert.equal(prefs.weights.ai, 2.5, 'Ceiling 2.5 must be enforced');
  assert.equal(prefs.weights.science, 0.15);
  assert.equal(prefs.weights.productivity, 1.85);
});

runTest('1.5: Non-numeric corrupted strings fall back to neutral 1.0', () => {
  localStorage.setItem('studenthub_news_preferences', JSON.stringify({
    weights: {
      technology: 'malformed_payload',
      ai: 'NaN',
      science: 'undefined',
      productivity: '{ evil: true }'
    }
  }));
  const prefs = getNewsPreferences();
  assert.equal(prefs.weights.technology, 1.0);
  assert.equal(prefs.weights.ai, 1.0);
  assert.equal(prefs.weights.science, 1.0);
  assert.equal(prefs.weights.productivity, 1.0);
});

runTest('1.6: resetNewsPreferences immediately neutralizes all weights and storage', () => {
  recordSwipe('art-1', 'ai', true);
  recordSwipe('art-2', 'technology', false);
  resetNewsPreferences();
  const prefs = getNewsPreferences();
  for (const [cat, w] of Object.entries(prefs.weights)) {
    assert.equal(w, 1.0, `Category ${cat} must be reset to 1.0`);
  }
  assert.deepEqual(prefs.swipes, {});
});

runTest('1.7: getPersonalizedNews ranks boosted categories first', () => {
  resetNewsPreferences();
  recordSwipe('art-1', 'ai', true);
  recordSwipe('art-1-b', 'ai', true);
  const personalized = getPersonalizedNews();
  assert.equal(personalized.length, 6);
  assert.equal(personalized[0].categoryKey, 'ai', 'Boosted category must rank at top of personalized feed');
});

runTest('1.8: [EMPIRICAL ADVERSARIAL] Whitespace, empty arrays, and <=0 values must fall back to 1.0', () => {
  localStorage.setItem('studenthub_news_preferences', JSON.stringify({
    weights: {
      technology: '   ',
      ai: [],
      science: 0,
      productivity: -5,
      university: [null]
    }
  }));
  const prefs = getNewsPreferences();
  assert.equal(prefs.weights.technology, 1.0, `Whitespace "   " must fall back to 1.0, got ${prefs.weights.technology}`);
  assert.equal(prefs.weights.ai, 1.0, `Empty array [] must fall back to 1.0, got ${prefs.weights.ai}`);
  assert.equal(prefs.weights.science, 1.0, `0 weight must fall back to 1.0, got ${prefs.weights.science}`);
  assert.equal(prefs.weights.productivity, 1.0, `Negative weight -5 must fall back to 1.0, got ${prefs.weights.productivity}`);
  assert.equal(prefs.weights.university, 1.0, `Array [null] must fall back to 1.0, got ${prefs.weights.university}`);
});

// ----------------------------------------------------------------------------
// Suite 2: aiOrganizer.js Past-Tense Queries & Anti-Hijacking
// ----------------------------------------------------------------------------
console.log('\n▶ Suite 2: aiOrganizer.js News Intent vs Calendar & Task Protection');

const verifiedPastTenseQueries = [
  'qué pasó hoy en tecnología',
  'que paso hoy en tecnologia',
  '¿qué pasó hoy en tecnología?',
  'qué ocurrió hoy en tecnología',
  'que ocurrio hoy en tecnologia',
  'dime qué pasó hoy en tecnología',
  'cuéntame qué pasó hoy en IA',
  'resumen de lo que pasó hoy en inteligencia artificial',
  'qué novedades hay hoy de tecnología',
  'dime noticias de hoy',
  'titulares del día'
];

for (const query of verifiedPastTenseQueries) {
  await runAsyncTest(`2.1: Past-tense news query "${query}" triggers news digest`, async () => {
    const res = await resolveAICopilotLocally(query);
    assert.ok(res && res.reply, 'Response must have reply');
    assert.equal(
      res.reply.includes('no tienes actividades ni tareas registradas'),
      false,
      `HIJACKING DETECTED: Query "${query}" was answered as calendar tasks check!`
    );
    const hasNewsMarker = res.reply.includes('📰') ||
      res.reply.includes('Noticias') ||
      res.reply.includes('Novedades') ||
      res.reply.includes('Inteligencia Artificial') ||
      res.reply.includes('Xataka') ||
      res.reply.includes('Groq');
    assert.ok(hasNewsMarker, `Response for "${query}" must be a news digest. Actual: ${res.reply.slice(0, 100)}...`);
  });
}

const haPasadoAdversarialQueries = [
  'qué ha pasado hoy en tecnología',
  'que ha pasado hoy en tecnologia',
  'qué ha pasado hoy en IA',
  'qué ha ocurrido hoy en tecnología',
  'que ha ocurrido hoy en tecnologia',
  'qué ha sucedido hoy en inteligencia artificial',
  'que ha sucedido hoy en IA',
  'cuéntame qué ha pasado hoy en tecnología'
];

for (const query of haPasadoAdversarialQueries) {
  await runAsyncTest(`2.2: [EMPIRICAL ADVERSARIAL] Compound past-tense "ha pasado / ocurrido / sucedido" query "${query}"`, async () => {
    const res = await resolveAICopilotLocally(query);
    assert.ok(res && res.reply, 'Response must have reply');
    assert.equal(
      res.reply.includes('no tienes actividades ni tareas registradas'),
      false,
      `HIJACKING DETECTED: Query "${query}" was hijacked by calendar "hoy" logic because "pasa" matched inside "pasado"!`
    );
    const hasNewsMarker = res.reply.includes('📰') ||
      res.reply.includes('Noticias') ||
      res.reply.includes('Novedades') ||
      res.reply.includes('Inteligencia Artificial') ||
      res.reply.includes('Xataka') ||
      res.reply.includes('Groq');
    assert.ok(hasNewsMarker, `Response for "${query}" must be a news digest.`);
  });
}

const infinitiveTaskCommands = [
  'añadir tarea ver noticias de inteligencia artificial',
  'anadir tarea ver noticias de inteligencia artificial',
  'añadir tarea repasar noticias de tecnología',
  'anadir tarea repasar novedades de IA',
  'crear tarea leer noticias de tecnología',
  'crear evento ver titulares de IA',
  'programar actividad leer novedades de tecnología',
  'apuntar tarea buscar noticias de computación cuántica'
];

for (const cmd of infinitiveTaskCommands) {
  await runAsyncTest(`2.3: Infinitive task command "${cmd}" is NOT hijacked by news digest`, async () => {
    const res = await resolveAICopilotLocally(cmd);
    assert.ok(res && res.reply, 'Response must have reply');
    const hasNewsDigest = res.reply.includes('📰 Novedades destacadas') ||
      res.reply.includes('📰 Noticias Destacadas de Hoy') ||
      res.reply.includes('Groq y los procesadores LPU');
    assert.equal(
      hasNewsDigest,
      false,
      `FALSE POSITIVE HIJACKING: Command "${cmd}" was hijacked by news digest! Reply: ${res.reply.slice(0, 80)}...`
    );
    const hasTaskAction = res.actions && res.actions.length > 0;
    const hasTaskResponse = res.reply.includes('tarea') || res.reply.includes('actividad') || res.reply.includes('program') || res.reply.includes('añad') || res.reply.includes('guard');
    assert.ok(hasTaskAction || hasTaskResponse, `Command "${cmd}" must be treated as a task. Reply: ${res.reply}`);
  });
}

await runAsyncTest('2.4: Rejection of non-news queries (math, greetings, calendar)', async () => {
  const mathRes = await resolveAICopilotLocally('cuanto es 2+2');
  assert.equal(mathRes.reply.includes('Noticias'), false);

  const greetingRes = await resolveAICopilotLocally('hola buenas tardes');
  assert.equal(greetingRes.reply.includes('Noticias'), false);

  const calendarRes = await resolveAICopilotLocally('¿qué clases tengo hoy en la universidad?');
  assert.equal(calendarRes.reply.includes('📰 Novedades destacadas'), false);
});

// ----------------------------------------------------------------------------
// Suite 3: whatsapp-bridge.js Intent Classifier & Markdown Formatting
// ----------------------------------------------------------------------------
console.log('\n▶ Suite 3: server/whatsapp-bridge.js Classifier & Formatting');

const waPastTenseCases = [
  { text: 'qué pasó hoy en tecnología', expectedNews: true, expectedTech: true },
  { text: 'que paso hoy en tecnologia', expectedNews: true, expectedTech: true },
  { text: 'dime qué ocurrió en tecnología', expectedNews: true, expectedTech: true },
  { text: 'noticias de hoy', expectedNews: true, expectedTech: false },
  { text: 'titulares del día', expectedNews: true, expectedTech: false },
];

for (const c of waPastTenseCases) {
  runTest(`3.1: WhatsApp classifier correctly identifies "${c.text}"`, () => {
    const classification = classifyWhatsAppNewsQuery(c.text);
    assert.equal(classification.isNewsQuery, c.expectedNews, `Expected isNewsQuery=${c.expectedNews} for "${c.text}"`);
    if (c.expectedTech) {
      assert.equal(classification.isAIOrTech, true, `Expected isAIOrTech=true for "${c.text}"`);
    }
  });
}

const waCompoundPastTenseCases = [
  { text: 'qué ha pasado hoy en tecnología', expectedNews: true },
  { text: 'que ha pasado hoy en tecnologia', expectedNews: true },
  { text: 'qué ha pasado hoy en IA', expectedNews: true },
  { text: 'qué ha ocurrido hoy en tecnología', expectedNews: true },
  { text: 'qué ha sucedido hoy en inteligencia artificial', expectedNews: true },
];

for (const c of waCompoundPastTenseCases) {
  runTest(`3.2: [EMPIRICAL ADVERSARIAL] WhatsApp classifier for "${c.text}" must not be excluded by "pasa" substring`, () => {
    const classification = classifyWhatsAppNewsQuery(c.text);
    assert.equal(
      classification.isNewsQuery,
      c.expectedNews,
      `Expected isNewsQuery=${c.expectedNews} for "${c.text}". Actual: isNewsQuery=${classification.isNewsQuery}. Root cause: exclusion regex /(?:pasa)/ matches inside "pasado"!`
    );
  });
}

const waTaskCommands = [
  'añadir tarea ver noticias de IA',
  'anadir tarea ver noticias de IA',
  'añade tarea revisar novedades de tecnología',
  'crear tarea leer noticias',
  'programa evento ver titulares de noticias',
  'elimina tarea de noticias'
];

for (const cmd of waTaskCommands) {
  runTest(`3.3: WhatsApp classifier rejects task command "${cmd}" from news intent`, () => {
    const classification = classifyWhatsAppNewsQuery(cmd);
    assert.equal(
      classification.isNewsQuery,
      false,
      `Task command "${cmd}" MUST NOT trigger isNewsQuery`
    );
  });
}

runTest('3.4: formatNewsForWhatsApp produces valid WhatsApp markdown and citations', () => {
  const formatted = formatNewsForWhatsApp(FALLBACK_NEWS);
  assert.ok(formatted.includes('*1. ['), 'Must contain bold numbered header for article');
  assert.ok(formatted.includes('_Fuente:'), 'Must contain italic source citations');
  assert.ok(!/<[^>]+>/.test(formatted), 'Must not contain raw HTML tags');
  assert.ok(formatted.includes('Xataka') && formatted.includes('Genbeta'), 'Must cite authoritative media');
});

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------
console.log('\n==============================================================================');
console.log(`  RE-VERIFICATION R3 RESULTS: ${passedTests} passed, ${failedTests} failed out of ${totalTests} tests`);
console.log('==============================================================================');

if (failures.length > 0) {
  console.log('\nEmpirical Failures Summary:');
  failures.forEach((f, idx) => {
    console.log(`  ${idx + 1}. ${f.name}`);
    console.log(`     -> ${f.error}`);
  });
}

if (failedTests > 0) {
  process.exit(1);
}
