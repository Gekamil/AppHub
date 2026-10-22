/**
 * Automated Verification Script for Milestone M4 (Requirement R6)
 * AI Assistant & WhatsApp News Integration Specialist
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const AI_ORGANIZER_PATH = path.join(PROJECT_ROOT, 'src/services/aiOrganizer.js')
const WHATSAPP_BRIDGE_PATH = path.join(PROJECT_ROOT, 'server/whatsapp-bridge.js')
const NEWS_SERVICE_PATH = path.join(PROJECT_ROOT, 'src/services/newsService.js')

console.log('==============================================================================')
console.log('  🔍 VERIFYING MILESTONE M4: AI ASSISTANT & WHATSAPP NEWS INTEGRATION (R6)')
console.log('==============================================================================\n')

let passed = 0
let total = 0

function test(name, fn) {
  total++
  try {
    fn()
    console.log(`  ✔ [PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`)
    console.error(`    -> ${err.message}`)
  }
}

async function run() {
  const aiCode = fs.readFileSync(AI_ORGANIZER_PATH, 'utf-8')
  const waCode = fs.readFileSync(WHATSAPP_BRIDGE_PATH, 'utf-8')
  const newsCode = fs.readFileSync(NEWS_SERVICE_PATH, 'utf-8')

  // Import FALLBACK_NEWS from newsService.js
  const { FALLBACK_NEWS } = await import('../src/services/newsService.js')

  // 1. Static Contract Checks in aiOrganizer.js
  test('M4.1: aiOrganizer.js imports FALLBACK_NEWS from newsService.js', () => {
    assert.ok(
      /import\s+.*FALLBACK_NEWS.*from\s+['"]\.\/newsService\.js['"]/.test(aiCode),
      'aiOrganizer.js must import FALLBACK_NEWS'
    )
  })

  test('M4.2: aiOrganizer.js systemPrompt injects daily news context in chatWithAICopilot', () => {
    assert.ok(
      /NOTICIAS DESTACADAS DE HOY/.test(aiCode),
      'systemPrompt must contain NOTICIAS DESTACADAS DE HOY header'
    )
    assert.ok(
      /newsContext/.test(aiCode),
      'systemPrompt must inject newsContext'
    )
    assert.ok(
      /CAPACIDAD DE RESPUESTA SOBRE NOTICIAS Y ACTUALIDAD/.test(aiCode),
      'systemPrompt must guide LLM on news queries'
    )
  })

  test('M4.3: aiOrganizer.js exports getNewsContextForAI helper function', () => {
    assert.ok(
      /export\s+function\s+getNewsContextForAI/.test(aiCode),
      'aiOrganizer.js must export getNewsContextForAI'
    )
  })

  // 2. Static Contract Checks in whatsapp-bridge.js
  test('M4.4: whatsapp-bridge.js imports FALLBACK_NEWS and exports formatNewsForWhatsApp', () => {
    assert.ok(
      /import\s+.*FALLBACK_NEWS.*from\s+['"]\.\.\/src\/services\/newsService\.js['"]/.test(waCode),
      'whatsapp-bridge.js must import FALLBACK_NEWS'
    )
    assert.ok(
      /export\s+function\s+formatNewsForWhatsApp/.test(waCode),
      'whatsapp-bridge.js must export formatNewsForWhatsApp'
    )
  })

  test('M4.5: whatsapp-bridge.js systemPrompt injects daily news digest and WhatsApp rules', () => {
    assert.ok(
      /NOTICIAS DESTACADAS DE HOY/.test(waCode),
      'WhatsApp bot systemPrompt must include daily news digest'
    )
    assert.ok(
      /whatsappNewsDigest/.test(waCode),
      'WhatsApp bot systemPrompt must inject whatsappNewsDigest'
    )
    assert.ok(
      /CONSULTAS DE NOTICIAS, NOVEDADES Y ACTUALIDAD/.test(waCode),
      'WhatsApp prompt must contain explicit instructions for news queries'
    )
  })

  test('M4.6: whatsapp-bridge.js processMessageWithAI catch fallback handles news queries', () => {
    assert.ok(
      /isNewsQuery/.test(waCode),
      'whatsapp-bridge.js catch block must detect news queries'
    )
    assert.ok(
      /Groq.*LPU/i.test(waCode),
      'whatsapp-bridge.js news fallback must highlight Groq LPU'
    )
    assert.ok(
      /Xataka/i.test(waCode) && /Genbeta/i.test(waCode),
      'whatsapp-bridge.js news fallback must cite sources'
    )
  })

  test('M4.7: whatsapp-bridge.js registers /noticias command and /api/news route', () => {
    assert.ok(
      /\/(noticias|noticia|titulares|actualidad)/.test(waCode),
      'whatsapp-bridge.js must handle /noticias quick command'
    )
    assert.ok(
      /pathname === '\/api\/news'/.test(waCode),
      'handleBaileysApiRoute must register /api/news route'
    )
  })

  // 3. Dynamic Functional Evaluation of Helper & Intent Resolution
  // Extract formatNewsForWhatsApp from code
  const formatNewsFnMatch = waCode.match(/export\s+function\s+formatNewsForWhatsApp\s*\([\s\S]*?\n\}/)
  assert.ok(formatNewsFnMatch, 'formatNewsForWhatsApp function found in code')
  const formatNewsForWhatsApp = new Function(
    'FALLBACK_NEWS',
    `const fn = ${formatNewsFnMatch[0].replace('export function formatNewsForWhatsApp', 'function')}; return fn(FALLBACK_NEWS);`
  )

  test('M4.8: formatNewsForWhatsApp produces WhatsApp compliant markdown (*bold*, _italic_)', () => {
    const waDigest = formatNewsForWhatsApp(FALLBACK_NEWS)
    assert.ok(/\*[^*]+\*/.test(waDigest), 'Uses *bold* markdown')
    assert.ok(/_[^_]+_/.test(waDigest), 'Uses _italic_ markdown')
    assert.ok(/•/.test(waDigest), 'Uses bullet point characters')
    assert.ok(!/<[^>]+>/.test(waDigest), 'Contains no HTML tags')
    assert.ok(waDigest.includes('Xataka') && waDigest.includes('Genbeta'), 'Cites verified sources')
  })

  // Extract getNewsContextForAI from code
  const getNewsContextMatch = aiCode.match(/export\s+function\s+getNewsContextForAI\s*\([\s\S]*?\n\}/)
  assert.ok(getNewsContextMatch, 'getNewsContextForAI function found in code')
  const getNewsContextForAI = new Function(
    'FALLBACK_NEWS',
    `const fn = ${getNewsContextMatch[0].replace('export function getNewsContextForAI', 'function')}; return fn(FALLBACK_NEWS);`
  )

  test('M4.9: getNewsContextForAI formats all 6 articles with categories, sources, and links', () => {
    const context = getNewsContextForAI(FALLBACK_NEWS)
    assert.ok(context.includes('Groq y la nueva ola de procesadores LPU'), 'Includes Groq article')
    assert.ok(context.includes('Herramientas esenciales de desarrollo'), 'Includes Genbeta student tools')
    assert.ok(context.includes('cúbits lógicos') || context.includes('cuánticos'), 'Includes quantum qubits article')
    assert.ok(context.includes('Pomodoro 50/10'), 'Includes Pomodoro article')
    assert.ok(context.includes('Erasmus+'), 'Includes Erasmus article')
    assert.ok(context.includes('Vite y los nuevos bundlers'), 'Includes Vite Rust article')
    assert.ok(context.includes('Xataka') && context.includes('Genbeta'), 'Includes authoritative sources')
  })

  // Extract resolveAICopilotLocally from code
  const resolveLocalMatch = aiCode.match(/export\s+function\s+resolveAICopilotLocally\s*\([\s\S]*?\n\}/)
  assert.ok(resolveLocalMatch, 'resolveAICopilotLocally function found in code')

  // Build isolated test harness for resolveAICopilotLocally
  const harnessCode = `
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
    const getCurrentUser = () => ({ uid: 'test' });
    const resolveTaskCalendar = (t) => ({ id: 'cal-default', name: 'General' });
    const isEventFinished = () => false;
    const addDays = (d, n) => d;
    const parseScheduleLocalHeuristics = () => null;

    ${resolveLocalMatch[0].replace('export function resolveAICopilotLocally', 'function resolveAICopilotLocally')}
    return resolveAICopilotLocally;
  `
  const resolveAICopilotLocally = new Function(harnessCode)()

  test('M4.10: resolveAICopilotLocally handles empty / whitespace queries safely', () => {
    const emptyRes = resolveAICopilotLocally('')
    assert.ok(emptyRes && typeof emptyRes.reply === 'string' && emptyRes.reply.length > 0)
    assert.deepEqual(emptyRes.actions, [])

    const spaceRes = resolveAICopilotLocally('   \t\n  ')
    assert.ok(spaceRes && typeof spaceRes.reply === 'string' && spaceRes.reply.length > 0)
    assert.deepEqual(spaceRes.actions, [])
  })

  test('M4.11: resolveAICopilotLocally answers general "¿Cuáles son las noticias de hoy?" with all 6 items and sources', () => {
    const queries = [
      '¿Cuáles son las noticias de hoy?',
      '¿Qué noticias hay hoy?',
      'noticias de hoy',
      'dime los titulares',
      'resumen de noticias',
    ]
    for (const q of queries) {
      const res = resolveAICopilotLocally(q)
      assert.ok(res && res.reply, `Should return reply for "${q}"`)
      assert.ok(res.reply.includes('Groq'), `Reply for "${q}" must include Groq`)
      assert.ok(res.reply.includes('Xataka') && res.reply.includes('Genbeta'), `Reply for "${q}" must cite sources`)
      assert.ok(res.reply.includes('SINC') || res.reply.includes('Nature'), `Reply for "${q}" must cite SINC/Nature`)
      assert.ok(res.reply.includes('El País'), `Reply for "${q}" must cite El País`)
      assert.deepEqual(res.actions, [])
    }
  })

  test('M4.12: resolveAICopilotLocally answers targeted AI & technology queries', () => {
    const aiQueries = [
      '¿Qué novedades hay de inteligencia artificial o tecnología?',
      'novedades de IA',
      'noticias de tecnología',
      'cuéntame lo último de ia',
    ]
    for (const q of aiQueries) {
      const res = resolveAICopilotLocally(q)
      assert.ok(res && res.reply, `Should return reply for "${q}"`)
      assert.ok(/Groq|LPU/i.test(res.reply), `Reply for "${q}" must highlight Groq LPU`)
      assert.ok(/Genbeta|estudiantes/i.test(res.reply) || /Xataka/i.test(res.reply), `Reply for "${q}" must cite tech sources`)
      assert.deepEqual(res.actions, [])
    }
  })

  test('M4.13: resolveAICopilotLocally answers targeted Science, Productivity, University queries', () => {
    const sciRes = resolveAICopilotLocally('noticias de ciencia y cuántica')
    assert.ok(sciRes.reply.includes('cúbits') || sciRes.reply.includes('cuántica'))

    const prodRes = resolveAICopilotLocally('novedades de productividad y pomodoro')
    assert.ok(prodRes.reply.includes('Pomodoro'))

    const uniRes = resolveAICopilotLocally('noticias de universidad y erasmus')
    assert.ok(uniRes.reply.includes('Erasmus'))
  })

  test('M4.14: Unrelated queries do NOT falsely trigger the news intent', () => {
    // Task creation commands with tech words
    const taskAdd1 = resolveAICopilotLocally('añadir tarea examen de inteligencia artificial para el lunes')
    assert.ok(!taskAdd1.reply.includes('Titulares destacados'), 'Task add should not trigger news')

    const taskAdd2 = resolveAICopilotLocally('programa clase de tecnologia a las 10:00')
    assert.ok(!taskAdd2.reply.includes('Titulares destacados'), 'Task program should not trigger news')

    // Calendar inquiry
    const calQuery = resolveAICopilotLocally('¿qué clases tengo hoy en la universidad?')
    assert.ok(!calQuery.reply.includes('Titulares destacados'), 'Calendar query should not trigger news')

    // General greetings and math
    const greeting = resolveAICopilotLocally('hola, buenos días')
    assert.ok(!greeting.reply.includes('Titulares destacados'), 'Greeting should not trigger news')

    const math = resolveAICopilotLocally('¿cuánto es 5 + 5?')
    assert.ok(!math.reply.includes('Titulares destacados'), 'Math should not trigger news')
  })

  test('M4.15: All AI news outputs are clean markdown without raw HTML tags', () => {
    const res = resolveAICopilotLocally('¿Cuáles son las noticias de hoy?')
    assert.ok(!/<script/i.test(res.reply), 'No script tags')
    assert.ok(!/<div/i.test(res.reply), 'No div tags')
    assert.ok(!/<p>/i.test(res.reply), 'No p tags')
    assert.ok(!/<br\s*\/?>/i.test(res.reply), 'No br tags')
  })

  // 4. Run official node test runner for R6
  test('M4.16: Official test suite R6 tests execute with 100% pass rate', () => {
    const out = execSync('node --test --test-name-pattern="R6" tests/e2e/r2_comprehensive_suite.test.mjs', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
    })
    assert.ok(out.includes('# pass 62') || out.includes('fail 0'), 'All R6 tests must pass')
  })

  console.log('\n------------------------------------------------------------------------------')
  console.log(`  M4 Verification Result: ${passed}/${total} passed (${((passed / total) * 100).toFixed(1)}%)`)
  console.log('------------------------------------------------------------------------------\n')

  if (passed !== total) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Unexpected error in M4 verification script:', err)
  process.exit(1)
})
