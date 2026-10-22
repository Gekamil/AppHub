/**
 * challenger_final_r3_verification.mjs
 * Dedicated Empirical Adversarial Verification Harness by challenger_final_r3
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Setup mock environment
const mockStorage = {};
globalThis.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(mockStorage, k) ? mockStorage[k] : null),
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
};
globalThis.window = { dispatchEvent: () => {} };
globalThis.CustomEvent = class CustomEvent {
  constructor(name, opts = {}) {
    this.type = name;
    this.detail = opts.detail || null;
  }
};

// Import services
const {
  getNewsPreferences,
  saveNewsPreferences,
  resetNewsPreferences,
  recordSwipe,
  getPersonalizedNews,
  FALLBACK_NEWS,
} = await import('../../src/services/newsService.js');

// Extract resolveAICopilotLocally from aiOrganizer.js
const aiOrganizerPath = path.join(PROJECT_ROOT, 'src/services/aiOrganizer.js');
const aiCode = fs.readFileSync(aiOrganizerPath, 'utf-8');
const resolveLocalMatch = aiCode.match(/export\s+function\s+resolveAICopilotLocally\s*\([\s\S]*?\n\}/);

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
const classifyMatch = whatsappCode.match(/export\s+function\s+classifyWhatsAppNewsQuery\s*\([\s\S]*?\n\}/);
const classifyWhatsAppNewsQuery = new Function(`
  ${classifyMatch[0].replace('export function classifyWhatsAppNewsQuery', 'function classifyWhatsAppNewsQuery')}
  return classifyWhatsAppNewsQuery;
`)();

let total = 0;
let passed = 0;
let failed = 0;
const failures = [];

async function check(desc, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✔ [PASS] ${desc}`);
  } catch (err) {
    failed++;
    failures.push({ desc, error: err.message });
    console.error(`  ✖ [FAIL] ${desc}: ${err.message}`);
  }
}

console.log('==============================================================================');
console.log('  CHALLENGER FINAL R3 — EMPIRICAL VERIFICATION HARNESS');
console.log('==============================================================================\n');

// 1. Stressing weight coercion and boundary behavior in newsService
console.log('▶ Battery 1: newsService Weight Coercion & Boundary Exhaustive Checks');

await check('1.1: Whitespace permutations fall back to 1.0', () => {
  const variations = [' ', '  ', '\t', '\n', '\r\n', '   \t  \n  '];
  for (const v of variations) {
    localStorage.setItem('studenthub_news_preferences', JSON.stringify({ weights: { technology: v } }));
    const p = getNewsPreferences();
    assert.equal(p.weights.technology, 1.0, `Failed on whitespace: ${JSON.stringify(v)}`);
  }
});

await check('1.2: Array variations fall back to 1.0', () => {
  const arrays = [[], [null], [1], ['foo'], [[2]]];
  for (const arr of arrays) {
    localStorage.setItem('studenthub_news_preferences', JSON.stringify({ weights: { ai: arr } }));
    const p = getNewsPreferences();
    assert.equal(p.weights.ai, 1.0, `Failed on array: ${JSON.stringify(arr)}`);
  }
});

await check('1.3: Non-positive numbers (0, -0, small negatives, up to -49.9) fall back to 1.0', () => {
  const values = [0, -0, -0.0001, -1, -5, -10, -49.99];
  for (const val of values) {
    localStorage.setItem('studenthub_news_preferences', JSON.stringify({ weights: { science: val } }));
    const p = getNewsPreferences();
    assert.equal(p.weights.science, 1.0, `Failed on non-positive value: ${val}`);
  }
});

await check('1.4: Extreme negative underflow (<= -50) clamps to 0.1 floor', () => {
  const extremes = [-50, -50.1, -100, -999.5, -100000];
  for (const ex of extremes) {
    localStorage.setItem('studenthub_news_preferences', JSON.stringify({ weights: { productivity: ex } }));
    const p = getNewsPreferences();
    assert.equal(p.weights.productivity, 0.1, `Failed to clamp extreme ${ex} to 0.1`);
  }
});

await check('1.5: Positive boundary clamping [0.1, 2.5] and floating rounding', () => {
  const testCases = [
    { in: 0.01, expected: 0.1 },
    { in: 0.09, expected: 0.1 },
    { in: 0.1, expected: 0.1 },
    { in: 1.234, expected: 1.23 },
    { in: 2.499, expected: 2.5 },
    { in: 2.5, expected: 2.5 },
    { in: 2.501, expected: 2.5 },
    { in: 9999.9, expected: 2.5 },
  ];
  for (const tc of testCases) {
    localStorage.setItem('studenthub_news_preferences', JSON.stringify({ weights: { university: tc.in } }));
    const p = getNewsPreferences();
    assert.equal(p.weights.university, tc.expected, `Failed on ${tc.in}: got ${p.weights.university}, expected ${tc.expected}`);
  }
});

await check('1.6: saveNewsPreferences reflects identical sanitization and clamping', () => {
  saveNewsPreferences({
    weights: {
      technology: '   \n ',
      ai: [],
      science: 0,
      productivity: -999.5,
      university: 50.0,
    }
  });
  const p = getNewsPreferences();
  assert.equal(p.weights.technology, 1.0);
  assert.equal(p.weights.ai, 1.0);
  assert.equal(p.weights.science, 1.0);
  assert.equal(p.weights.productivity, 0.1);
  assert.equal(p.weights.university, 2.5);
});

// 2. AI Copilot Intent Anti-Hijacking and Compound Past Verification
console.log('\n▶ Battery 2: aiOrganizer.js Copilot Intent & Anti-Hijacking Verification');

const compoundPastQueries = [
  'qué ha pasado hoy en tecnología',
  'que ha pasado hoy en tecnologia',
  '¿qué ha pasado hoy en tecnología?',
  '¿que ha pasado hoy en tecnologia?',
  'qué ha pasado hoy en IA',
  'que ha pasado hoy en IA',
  'qué ha ocurrido hoy en tecnología',
  'que ha ocurrido hoy en tecnologia',
  '¿qué ha ocurrido hoy en tecnología?',
  'qué ha sucedido hoy en inteligencia artificial',
  'que ha sucedido hoy en inteligencia artificial',
  'cuéntame qué ha pasado hoy en tecnología',
  'dime qué ha ocurrido hoy en IA',
  'resumen de lo que ha sucedido hoy en tecnología'
];

for (const q of compoundPastQueries) {
  await check(`2.1: Compound query "${q}" triggers news and avoids calendar hijacking`, async () => {
    const res = await resolveAICopilotLocally(q);
    assert.ok(res && res.reply, 'Must return reply');
    assert.equal(
      res.reply.includes('no tienes actividades ni tareas registradas'),
      false,
      `Calendar hijacked query: "${q}"`
    );
    const hasNewsMarkers = res.reply.includes('📰') ||
      res.reply.includes('Inteligencia Artificial') ||
      res.reply.includes('Tecnología & Software') ||
      res.reply.includes('Groq') ||
      res.reply.includes('Xataka');
    assert.ok(hasNewsMarkers, `Did not return news digest for "${q}". Reply: ${res.reply.slice(0, 100)}`);
  });
}

const taskCommandsWithPotentialCollisions = [
  'pasa la tarea a mañana',
  'pasa la tarea de tecnología a mañana',
  'por favor pasa mi entrega de software al viernes',
  'añadir tarea repasar novedades de IA',
  'anadir tarea revisar noticias de tecnología',
  'crear tarea estudiar avances en inteligencia artificial',
  'crear evento ver noticias',
  'programa la reunión de tecnología para las 10',
  'borra la tarea de tecnología',
  'elimina la tarea de inteligencia artificial'
];

for (const cmd of taskCommandsWithPotentialCollisions) {
  await check(`2.2: Task command "${cmd}" is NOT hijacked by news digest`, async () => {
    const res = await resolveAICopilotLocally(cmd);
    assert.ok(res && res.reply, 'Must return reply');
    const isNewsDigest = res.reply.includes('📰 Novedades destacadas') ||
      res.reply.includes('Groq y los procesadores LPU') ||
      res.reply.includes('Herramientas esenciales para universitarios');
    assert.equal(isNewsDigest, false, `Task command "${cmd}" falsely triggered news digest!`);
  });
}

// 3. WhatsApp Bridge Classifier Verification
console.log('\n▶ Battery 3: server/whatsapp-bridge.js Classifier Stress');

const waCompoundQueries = [
  'qué ha pasado hoy en tecnología',
  'que ha pasado hoy en tecnologia',
  '¿qué ha pasado hoy en IA?',
  'qué ha ocurrido hoy en tecnología',
  'que ha ocurrido hoy en tecnologia',
  'qué ha sucedido hoy en inteligencia artificial',
  'dime qué ha pasado en tecnología',
  'cuéntame qué ha ocurrido en IA'
];

for (const q of waCompoundQueries) {
  await check(`3.1: WhatsApp classifier detects compound news query "${q}"`, () => {
    const result = classifyWhatsAppNewsQuery(q);
    assert.equal(result.isNewsQuery, true, `Query "${q}" was not recognized as news`);
    assert.equal(result.isAIOrTech, true, `Query "${q}" was not recognized as AI/Tech`);
  });
}

const waTaskExclusions = [
  'pasa la tarea a mañana',
  'pasa la tarea de tecnología al viernes',
  'añadir tarea ver noticias de tecnología',
  'crear tarea estudiar IA',
  'programa reunión de tecnología',
  'borra tarea de noticias'
];

for (const cmd of waTaskExclusions) {
  await check(`3.2: WhatsApp classifier excludes task command "${cmd}" from news`, () => {
    const result = classifyWhatsAppNewsQuery(cmd);
    assert.equal(result.isNewsQuery, false, `Task command "${cmd}" must NOT be classified as news query`);
  });
}

// Summary
console.log('\n==============================================================================');
console.log(`  VERIFICATION RESULTS: ${passed} passed, ${failed} failed out of ${total} tests`);
console.log('==============================================================================');

if (failed > 0) {
  process.exit(1);
}
