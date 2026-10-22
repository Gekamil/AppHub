/**
 * StudentHub Adversarial Stress Test Suite: Requirements R4, R5, R6
 *
 * Challenger 2: Adversarial Stress Challenger
 * Tests:
 * 1. News Engine & Preferences Persistence (R4 & R5):
 *    - Corrupted localStorage JSON handling
 *    - Empty arrays and malformed article structures
 *    - Rapid swipe bursts (100 likes / 100 dislikes) and decimal precision
 *    - Strict boundary clamping [0.1, 2.5]
 *    - Immediate neutrality reset via resetNewsPreferences()
 * 2. NewsSwipePersonalizer Gesture Physics & Safety (R5):
 *    - Sub-threshold drags (<90px) spring-back physics
 *    - Full swipe release (>90px, <-90px) triggering
 *    - Pointer cancellation and lost pointer capture safety
 *    - Tactile buttons and deck completion state
 * 3. AI Assistant & WhatsApp Integration (R6):
 *    - Subtle news phrasings ("dime novedades de IA", "titulares del día", "qué pasó hoy en tecnología")
 *    - False positive rejection (math, greetings, task creation commands)
 *    - Formatting: clean markdown, 0 raw HTML tags, valid authoritative media citations
 *    - WhatsApp bridge intent detection and formatNewsForWhatsApp verification
 */

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MockStorage, readUtf8, stripComments } from '../helpers/test_utils.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '../..')

// Setup global mock environment for newsService before import
const mockStorage = new MockStorage()
let dispatchedEvents = []

globalThis.localStorage = mockStorage
globalThis.window = {
  dispatchEvent: (event) => {
    dispatchedEvents.push(event)
  },
}
globalThis.CustomEvent = class CustomEvent {
  constructor(name, options = {}) {
    this.type = name
    this.detail = options.detail || null
  }
}

// Dynamic import of newsService
const newsService = await import('../../src/services/newsService.js')
const {
  FALLBACK_NEWS,
  DEFAULT_PREFERENCES,
  getNewsPreferences,
  saveNewsPreferences,
  resetNewsPreferences,
  recordSwipe,
  getPersonalizedNews,
  getDailyNews,
} = newsService

// Extract resolveAICopilotLocally from aiOrganizer.js for isolated testing
const aiOrganizerPath = path.join(PROJECT_ROOT, 'src/services/aiOrganizer.js')
const aiCode = fs.readFileSync(aiOrganizerPath, 'utf-8')
const resolveLocalMatch = aiCode.match(/export\s+function\s+resolveAICopilotLocally\s*\([\s\S]*?\n\}/)

if (!resolveLocalMatch) {
  throw new Error('Could not find resolveAICopilotLocally in src/services/aiOrganizer.js')
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
`
const resolveAICopilotLocally = new Function(aiHarnessCode)()

// Read and isolate WhatsApp bridge functions
const whatsappBridgePath = path.join(PROJECT_ROOT, 'server/whatsapp-bridge.js')
const whatsappCode = fs.readFileSync(whatsappBridgePath, 'utf-8')

const formatNewsMatch = whatsappCode.match(/export\s+function\s+formatNewsForWhatsApp\s*\([\s\S]*?\n\}/)
const formatNewsForWhatsApp = new Function(`
  const FALLBACK_NEWS = ${JSON.stringify(FALLBACK_NEWS)};
  ${formatNewsMatch[0].replace('export function formatNewsForWhatsApp', 'function formatNewsForWhatsApp')}
  return formatNewsForWhatsApp;
`)()

// Extract WhatsApp bridge AI news query classifier from server/whatsapp-bridge.js
const classifyMatch = whatsappCode.match(/export\s+function\s+classifyWhatsAppNewsQuery\s*\([\s\S]*?\n\}/)
const classifyWhatsAppNewsQuery = classifyMatch
  ? new Function(`
      ${classifyMatch[0].replace('export function classifyWhatsAppNewsQuery', 'function classifyWhatsAppNewsQuery')}
      return classifyWhatsAppNewsQuery;
    `)()
  : function classifyWhatsAppNewsQuery(userText) {
      const lowerUserText = (userText || '').toLowerCase()
      const isNewsQuery = (
        /(?:noticia|novedad|titular|actualidad|bolet[ií]n)/i.test(lowerUserText) ||
        /(?:qu[eé]\s+(?:hay|sabes|pasa|pas[oó]|ha\s+pasado|ocurri[oó]|sucedi[oó])|dime|cu[eé]ntame).*?(?:tecnolog|inteligencia artificial|\bia\b)/i.test(lowerUserText)
      ) && !/(?:a[ñn]ad|crea|pon|programa|apunta|borra|elimina|quita|suprime|cambia|pasa|mueve|asigna)/i.test(lowerUserText)
      const isAIOrTech = /ia|inteligencia artificial|tecnolog|software|hardware/i.test(lowerUserText)
      return { isNewsQuery, isAIOrTech }
    }

// ==============================================================================
// 1. NEWS ENGINE & PERSISTENCE ADVERSARIAL STRESS TESTS (R4 & R5)
// ==============================================================================

describe('Adversarial Challenge 1: News Persistence & Storage Corruption Resilience (R4 & R5)', () => {
  beforeEach(() => {
    mockStorage.clear()
    dispatchedEvents = []
  })

  it('1.1.1: Recovers gracefully from corrupted non-JSON strings in localStorage', () => {
    const corruptValues = [
      '{ broken: json [unclosed',
      'undefined',
      '<<<NOT_JSON>>>',
      '{ "weights": { "ai": ',
      '',
    ]

    for (const val of corruptValues) {
      mockStorage.setItem('studenthub_news_preferences', val)
      const prefs = getNewsPreferences()
      assert.ok(prefs && typeof prefs === 'object', 'Must return an object on corrupt JSON')
      assert.ok(prefs.weights && typeof prefs.weights === 'object', 'Must return weights object')
      assert.strictEqual(prefs.weights.ai, 1.0, `Weight must fallback to neutral 1.0 for: ${val}`)
      assert.strictEqual(prefs.weights.tech, 1.0)
      assert.deepEqual(prefs.swipes, {}, 'Swipes must fallback to empty object')
    }
  })

  it('1.1.2: Recovers gracefully from invalid non-object JSON values (null, numbers, arrays, strings)', () => {
    const invalidTypes = [
      'null',
      '12345',
      '"a plain string"',
      'true',
      '[1, 2, 3]',
    ]

    for (const val of invalidTypes) {
      mockStorage.setItem('studenthub_news_preferences', val)
      const prefs = getNewsPreferences()
      assert.ok(prefs && typeof prefs === 'object')
      assert.strictEqual(prefs.weights.ai, 1.0)
      assert.strictEqual(prefs.weights.software, 1.0)
      assert.deepEqual(prefs.swipes, {})
    }
  })

  it('1.1.3: Sanitizes corrupted weights (NaN strings, Infinity strings, negative values, extreme ceilings)', () => {
    const corruptedPayload = JSON.stringify({
      weights: {
        ai: 'NOT_A_NUMBER',
        tech: 'Infinity',
        science: -999.5,
        productivity: 9999.9,
        software: 'NaN',
      },
      swipes: ['invalid', 'array', 'format'],
      lastUpdated: 'yesterday',
    })

    mockStorage.setItem('studenthub_news_preferences', corruptedPayload)
    const prefs = getNewsPreferences()

    // Non-finite or invalid strings fallback to neutral 1.0
    assert.strictEqual(prefs.weights.ai, 1.0, 'Non-numeric string must fallback to neutral 1.0')
    assert.strictEqual(prefs.weights.tech, 1.0, '"Infinity" string must fallback to neutral 1.0')
    assert.strictEqual(prefs.weights.software, 1.0, '"NaN" string must fallback to neutral 1.0')

    // Extremes must be strictly clamped in [0.1, 2.5]
    assert.strictEqual(prefs.weights.science, 0.1, 'Negative weight must clamp strictly to 0.1 floor')
    assert.strictEqual(prefs.weights.productivity, 2.5, 'Excessive weight must clamp strictly to 2.5 ceiling')

    // Swipes as array must be converted back to empty object
    assert.deepEqual(prefs.swipes, {}, 'Array swipes must be sanitized to object')
  })

  it('1.1.3b: [EMPIRICAL FINDING] Null weight coercion in newsService: null is coerced to 0 and clamped to 0.1 dislike penalty instead of neutral 1.0', () => {
    // When localStorage contains { weights: { university: null } }
    mockStorage.setItem('studenthub_news_preferences', JSON.stringify({
      weights: { university: null },
      swipes: {},
    }))
    const prefs = getNewsPreferences()

    // Empirical observation: Number(null) is 0, so Math.max(0.1, Math.min(2.5, 0)) yields 0.1
    // The specification requires neutral fallback (1.0).
    const isNeutral = prefs.weights.university === 1.0
    if (!isNeutral) {
      console.warn('  ⚠️ VULNERABILITY DETECTED in newsService: null weight was coerced to 0 and clamped to 0.1 penalty!')
      console.warn('     Actual weight:', prefs.weights.university)
    }
    assert.ok(
      isNeutral,
      'CORRUPTION VULNERABILITY: null weight in storage must fallback to neutral 1.0, NOT be penalized to 0.1'
    )
  })

  it('1.1.4: Handles empty arrays and malformed articles in getPersonalizedNews without crashing', () => {
    // Empty array -> falls back to FALLBACK_NEWS
    const emptyResult = getPersonalizedNews([])
    assert.ok(Array.isArray(emptyResult), 'Must return an array')
    assert.strictEqual(emptyResult.length, 6, 'Must fallback to 6 articles when empty array passed')

    // null / undefined
    const nullResult = getPersonalizedNews(null)
    assert.strictEqual(nullResult.length, 6)

    // Articles with missing fields
    const malformedArticles = [
      { id: 'broken-1' }, // Missing categoryKey, title, summary
      { title: 'No ID' }, // Missing id
      { id: 'partial-3', categoryKey: 'unknown_category' },
    ]
    const customResult = getPersonalizedNews(malformedArticles)
    assert.strictEqual(customResult.length, 3)
    assert.ok(typeof customResult[0].score === 'number', 'Every article must receive a numeric score')
    assert.ok(!Number.isNaN(customResult[0].score), 'Score must not be NaN')
  })

  it('1.1.5: Burst Swipes: 100 consecutive likes for AI strictly clamps weight at 2.5 ceiling', () => {
    resetNewsPreferences()
    for (let i = 0; i < 100; i++) {
      recordSwipe(`burst-like-${i}`, 'ai', 'like')
    }

    const prefs = getNewsPreferences()
    assert.strictEqual(prefs.weights.ai, 2.5, 'AI weight must clamp strictly at 2.5 after 100 likes')
    assert.strictEqual(prefs.weights.software, 1.0, 'Unrelated software weight must remain unaffected at 1.0')
  })

  it('1.1.6: Burst Swipes: 100 consecutive dislikes for Software strictly clamps weight at 0.1 floor', () => {
    resetNewsPreferences()
    for (let i = 0; i < 100; i++) {
      recordSwipe(`burst-dislike-${i}`, 'software', 'dislike')
    }

    const prefs = getNewsPreferences()
    assert.strictEqual(prefs.weights.software, 0.1, 'Software weight must clamp strictly at 0.1 after 100 dislikes')
    assert.strictEqual(prefs.weights.ai, 1.0, 'Unrelated AI weight must remain unaffected at 1.0')
  })

  it('1.1.7: Weight decimal precision sanity check avoids IEEE 754 floating-point creep', () => {
    resetNewsPreferences()
    // Perform 3 likes (1.0 + 0.3 + 0.3 + 0.3 = 1.9, NOT 1.8999999999999999)
    recordSwipe('n1', 'productivity', 'like')
    recordSwipe('n2', 'productivity', 'like')
    recordSwipe('n3', 'productivity', 'like')

    const prefs = getNewsPreferences()
    assert.strictEqual(prefs.weights.productivity, 1.9, 'Must avoid float precision artifacts')

    // Dislike 2 times (1.9 - 0.3 - 0.3 = 1.3)
    recordSwipe('n4', 'productivity', 'dislike')
    recordSwipe('n5', 'productivity', 'dislike')
    const prefs2 = getNewsPreferences()
    assert.strictEqual(prefs2.weights.productivity, 1.3, 'Must maintain clean 2-decimal precision')
  })

  it('1.1.8: Immediate neutrality reset via resetNewsPreferences() clears all history and weights', () => {
    // Dirty the state
    recordSwipe('n1', 'ai', 'like')
    recordSwipe('n2', 'science', 'dislike')
    recordSwipe('n3', 'tech', 'like')

    const before = getNewsPreferences()
    assert.notStrictEqual(before.weights.ai, 1.0)
    assert.strictEqual(Object.keys(before.swipes).length, 3)

    // Reset
    const resetResult = resetNewsPreferences()
    assert.strictEqual(resetResult.weights.ai, 1.0)
    assert.strictEqual(resetResult.weights.tech, 1.0)
    assert.strictEqual(resetResult.weights.science, 1.0)
    assert.strictEqual(resetResult.weights.productivity, 1.0)
    assert.strictEqual(resetResult.weights.university, 1.0)
    assert.strictEqual(resetResult.weights.software, 1.0)
    assert.deepEqual(resetResult.swipes, {})

    // Check storage persistence
    const after = getNewsPreferences()
    assert.deepEqual(after.weights, resetResult.weights)
    assert.deepEqual(after.swipes, {})

    // Check event dispatching
    const resetEvent = dispatchedEvents.find(e => e.type === 'studenthub_news_preferences_changed')
    assert.ok(resetEvent, 'Must dispatch studenthub_news_preferences_changed event on reset')
  })
})

// ==============================================================================
// 2. NEWSSWIPEPERSONALIZER GESTURE PHYSICS & SAFETY (R5)
// ==============================================================================

describe('Adversarial Challenge 2: NewsSwipePersonalizer Gesture Physics & Safety (R5)', () => {
  const componentPath = path.join(PROJECT_ROOT, 'src/components/news/NewsSwipePersonalizer.jsx')
  const componentCode = fs.readFileSync(componentPath, 'utf-8')
  const cleanCode = stripComments(componentCode)

  it('2.1.1: Enforces strict 90px threshold (SWIPE_THRESHOLD = 90)', () => {
    assert.ok(
      /const\s+SWIPE_THRESHOLD\s*=\s*90\b/.test(cleanCode),
      'SWIPE_THRESHOLD must be defined as 90px'
    )
  })

  it('2.1.2: Sub-threshold drags (<90px and > -90px) spring back to center without swipe', () => {
    assert.ok(
      cleanCode.includes('dragOffset.x > SWIPE_THRESHOLD') &&
      cleanCode.includes('dragOffset.x < -SWIPE_THRESHOLD') &&
      cleanCode.includes('setDragOffset({ x: 0, y: 0 })'),
      'Must spring back to { x: 0, y: 0 } when drag offset is within (-90, 90)'
    )
  })

  it('2.1.3: Full swipe releases trigger right (like) and left (dislike) swipe callbacks', () => {
    assert.ok(
      cleanCode.includes("triggerSwipe('right')") &&
      cleanCode.includes("triggerSwipe('left')"),
      'Must invoke triggerSwipe with right on positive offset and left on negative offset'
    )
    assert.ok(
      cleanCode.includes("recordSwipe(currentCard.id, currentCard.categoryKey, 'like')") &&
      cleanCode.includes("recordSwipe(currentCard.id, currentCard.categoryKey, 'dislike')"),
      'Must record like / dislike in newsService'
    )
    assert.ok(
      cleanCode.includes('if (onPreferenceChange)'),
      'Must invoke onPreferenceChange callback when preference changes'
    )
  })

  it('2.1.4: Pointer cancellation & pointer capture release safety with try/catch', () => {
    assert.ok(
      cleanCode.includes('handlePointerCancel'),
      'Must implement handlePointerCancel handler'
    )
    assert.ok(
      /try\s*\{\s*e\.currentTarget\.releasePointerCapture/m.test(cleanCode),
      'Must wrap releasePointerCapture in try/catch to prevent uncaught DOMExceptions on pointer cancel'
    )
  })

  it('2.1.5: Tactile control buttons for Red Reject, Green Approve, and Reset Preferences', () => {
    assert.ok(cleanCode.includes('handleReject'), 'Must provide handleReject button callback')
    assert.ok(cleanCode.includes('handleApprove'), 'Must provide handleApprove button callback')
    assert.ok(cleanCode.includes('handleReset'), 'Must provide handleReset button callback')
    assert.ok(
      /border-rose-500|text-rose-500/.test(cleanCode) && /border-emerald-500|text-emerald-500/.test(cleanCode),
      'Must display red reject and green approve styled tactile buttons'
    )
  })

  it('2.1.6: Renders completion state when all cards swiped with reset option', () => {
    assert.ok(
      cleanCode.includes('currentIndex >= cards.length'),
      'Must detect completion when currentIndex exceeds deck length'
    )
    assert.ok(
      cleanCode.includes('¡Estás al día!') || cleanCode.includes('Reiniciar tarjetas'),
      'Must display completion screen with restart capability'
    )
  })
})

// ==============================================================================
// 3. AI ASSISTANT & WHATSAPP INTEGRATION ADVERSARIAL STRESS TESTS (R6)
// ==============================================================================

describe('Adversarial Challenge 3: AI Assistant & WhatsApp Query Intent & Formatting (R6)', () => {
  // 3.1 SUBTLE NEWS PHRASINGS
  describe('3.1: Subtle News Phrasing Recognition', () => {
    it('3.1.1: "dime novedades de IA" triggers targeted AI news response in resolveAICopilotLocally', () => {
      const res = resolveAICopilotLocally('dime novedades de IA')
      assert.ok(
        res.reply.includes('Inteligencia Artificial') && res.reply.includes('Groq'),
        'Must return AI news highlighting Groq and LPU'
      )
      assert.strictEqual(res.actions.length, 0, 'Must not generate task actions')
    })

    it('3.1.2: "titulares del día" triggers general news response with 6 headlines in resolveAICopilotLocally', () => {
      const res = resolveAICopilotLocally('titulares del día')
      assert.ok(
        res.reply.includes('Titulares destacados de hoy'),
        'Must return general headlines digest'
      )
      assert.ok(res.reply.includes('1.') && res.reply.includes('6.'), 'Must list all 6 items')
    })

    it('3.1.3: [EMPIRICAL FINDING] "qué pasó hoy en tecnología" intent recognition test', () => {
      const res = resolveAICopilotLocally('qué pasó hoy en tecnología')
      const isNewsResponse = res.reply.includes('Titulares destacados') ||
                             res.reply.includes('Novedades destacadas') ||
                             res.reply.includes('Tecnología')
      if (!isNewsResponse) {
        console.warn('  ⚠️ VULNERABILITY DETECTED in aiOrganizer: "qué pasó hoy en tecnología" was hijacked by calendar "hoy" check!')
        console.warn('     Actual reply:', res.reply)
      }
      assert.ok(
        isNewsResponse,
        'INTENT HIJACKING: "qué pasó hoy en tecnología" must trigger technology news intent, NOT calendar tasks check'
      )
    })

    it('3.1.4: [EMPIRICAL FINDING] "que paso hoy en tecnologia" (unaccented) intent recognition test', () => {
      const res = resolveAICopilotLocally('que paso hoy en tecnologia')
      const isNewsResponse = res.reply.includes('Titulares destacados') ||
                             res.reply.includes('Novedades destacadas') ||
                             res.reply.includes('Tecnología')
      assert.ok(
        isNewsResponse,
        'INTENT HIJACKING: "que paso hoy en tecnologia" must trigger technology news intent without accents'
      )
    })

    it('3.1.5: [EMPIRICAL FINDING] WhatsApp Bridge news intent classifier for subtle phrasings', () => {
      // Test "dime novedades de IA" in WhatsApp bridge
      const aiQuery = classifyWhatsAppNewsQuery('dime novedades de IA')
      assert.strictEqual(aiQuery.isNewsQuery, true, 'WhatsApp bridge must recognize "dime novedades de IA"')
      assert.strictEqual(aiQuery.isAIOrTech, true, 'WhatsApp bridge must flag AI/Tech category')

      // Test "titulares del día" in WhatsApp bridge
      const titularesQuery = classifyWhatsAppNewsQuery('titulares del día')
      assert.strictEqual(titularesQuery.isNewsQuery, true, 'WhatsApp bridge must recognize "titulares del día"')

      // Test "qué pasó hoy en tecnología" in WhatsApp bridge
      const techQuery = classifyWhatsAppNewsQuery('qué pasó hoy en tecnología')
      if (!techQuery.isNewsQuery) {
        console.warn('  ⚠️ VULNERABILITY DETECTED in whatsapp-bridge: "qué pasó hoy en tecnología" is NOT recognized by isNewsQuery regex!')
      }
      assert.ok(
        techQuery.isNewsQuery,
        'WHATSAPP INTENT FAILURE: "qué pasó hoy en tecnología" must be recognized as news query in whatsapp-bridge.js'
      )
    })
  })

  // 3.2 FALSE POSITIVE REJECTION
  describe('3.2: False Positive Rejection (Non-News Queries)', () => {
    it('3.2.1: Math queries (e.g. "cuanto es 2+2") MUST NOT trigger news intent', () => {
      const mathQueries = ['cuanto es 2+2', '¿cuánto es 5 + 5?', '10 * 3']
      for (const q of mathQueries) {
        const res = resolveAICopilotLocally(q)
        assert.ok(
          !res.reply.includes('Titulares destacados') && !res.reply.includes('Groq'),
          `Math query "${q}" must NOT return news`
        )
      }
    })

    it('3.2.2: Pure greetings (e.g. "hola buenas tardes") MUST NOT trigger news intent', () => {
      const greetings = ['hola', 'buenas tardes', 'buenos días', 'hola, ¿qué tal?']
      for (const g of greetings) {
        const res = resolveAICopilotLocally(g)
        assert.ok(
          !res.reply.includes('Titulares destacados') && !res.reply.includes('Groq'),
          `Greeting "${g}" must NOT return news`
        )
      }
    })

    it('3.2.3: Task creation command "añadir tarea estudiar examen de inteligencia artificial" MUST NOT trigger news intent', () => {
      const res = resolveAICopilotLocally('añadir tarea estudiar examen de inteligencia artificial')
      assert.ok(
        !res.reply.includes('Titulares destacados') && !res.reply.includes('Groq y los procesadores LPU'),
        'Task creation command with IA keyword must NOT return news digest'
      )
    })

    it('3.2.4: [EMPIRICAL FINDING] Task creation "añadir tarea ver noticias de inteligencia artificial" must not be hijacked by news intent', () => {
      const res = resolveAICopilotLocally('añadir tarea ver noticias de inteligencia artificial')
      const isNewsResponse = res.reply.includes('Titulares destacados') || res.reply.includes('Groq')
      if (isNewsResponse) {
        console.warn('  ⚠️ VULNERABILITY DETECTED in aiOrganizer: "añadir tarea ver noticias..." was hijacked as news query because "añadir" is not in isTaskActionCommand!')
      }
      assert.ok(
        !isNewsResponse,
        'FALSE POSITIVE VULNERABILITY: "añadir tarea ver noticias..." is a task command and MUST NOT be answered with news digest'
      )
    })

    it('3.2.5: [EMPIRICAL FINDING] WhatsApp Bridge task creation "añadir tarea ver noticias de IA" must not trigger isNewsQuery', () => {
      const classification = classifyWhatsAppNewsQuery('añadir tarea ver noticias de IA')
      if (classification.isNewsQuery) {
        console.warn('  ⚠️ VULNERABILITY DETECTED in whatsapp-bridge: "añadir tarea ver noticias..." triggers isNewsQuery because "añadir" is omitted from exclusion regex!')
      }
      assert.strictEqual(
        classification.isNewsQuery,
        false,
        'WHATSAPP FALSE POSITIVE: Task creation command starting with "añadir" must NOT trigger isNewsQuery'
      )
    })

    it('3.2.6: Calendar query "¿qué clases tengo hoy en la universidad?" MUST NOT trigger news intent', () => {
      const res = resolveAICopilotLocally('¿qué clases tengo hoy en la universidad?')
      assert.ok(
        !res.reply.includes('Titulares destacados') && !res.reply.includes('Convocatorias Erasmus+'),
        'Calendar query must NOT be answered with news'
      )
    })
  })

  // 3.3 FORMATTING & CITATIONS COMPLIANCE
  describe('3.3: Formatting, Markdown & Authoritative Citations', () => {
    it('3.3.1: News replies contain ZERO raw HTML tags (e.g. <script>, <div>, <p>, <a>, <br>)', () => {
      const queries = [
        'dime las noticias de hoy',
        'dime novedades de IA',
        'noticias de tecnología',
        'noticias de ciencia',
        'noticias de productividad',
        'noticias de universidad',
      ]

      for (const q of queries) {
        const res = resolveAICopilotLocally(q)
        assert.ok(
          !/<(?:script|div|span|p|a|br|h\d)\b[^>]*>/i.test(res.reply),
          `News reply for "${q}" must not contain raw HTML tags`
        )
      }
    })

    it('3.3.2: General news response cites authoritative media (Xataka, Genbeta, SINC, Nature, El País)', () => {
      const res = resolveAICopilotLocally('¿Cuáles son las noticias de hoy?')
      assert.ok(res.reply.includes('Xataka'), 'Must cite Xataka')
      assert.ok(res.reply.includes('Genbeta'), 'Must cite Genbeta')
      assert.ok(res.reply.includes('SINC') || res.reply.includes('Nature'), 'Must cite SINC or Nature')
      assert.ok(res.reply.includes('El País'), 'Must cite El País')
    })

    it('3.3.3: formatNewsForWhatsApp produces valid WhatsApp markdown (*bold*, _italic_) with authoritative citations', () => {
      const output = formatNewsForWhatsApp(FALLBACK_NEWS)
      assert.ok(typeof output === 'string' && output.length > 100, 'Must produce formatted string')
      assert.ok(!/<[^>]+>/.test(output), 'WhatsApp output must contain zero HTML tags')
      assert.ok(/\*\d+\.\s+\[.*?\]\s+.*?\*/.test(output), 'WhatsApp output must format headlines with *bold*')
      assert.ok(/_Fuente:\s+.*?_/.test(output), 'WhatsApp output must format sources with _italic_')
      assert.ok(output.includes('Xataka'), 'WhatsApp output must cite Xataka')
      assert.ok(output.includes('Genbeta'), 'WhatsApp output must cite Genbeta')
      assert.ok(output.includes('SINC') || output.includes('Nature'), 'WhatsApp output must cite SINC or Nature')
      assert.ok(output.includes('El País'), 'WhatsApp output must cite El País')
    })
  })
})
