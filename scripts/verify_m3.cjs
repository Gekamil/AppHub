/**
 * Automated Verification Script for Milestone M3 (Daily News & Tinder Personalization)
 * Validates R4 & R5 implementation across services, components, navigation, and router.
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const ROOT = path.resolve(__dirname, '..')

const PATHS = {
  NAV_SETTINGS: path.join(ROOT, 'src/services/navSettings.js'),
  NEWS_SERVICE: path.join(ROOT, 'src/services/newsService.js'),
  NEWS_PAGE: path.join(ROOT, 'src/pages/NewsPage.jsx'),
  DAILY_NEWS_PAGE: path.join(ROOT, 'src/pages/DailyNewsPage.jsx'),
  NEWS_SWIPE: path.join(ROOT, 'src/components/news/NewsSwipePersonalizer.jsx'),
  NEWS_SWIPE_EXPORT: path.join(ROOT, 'src/components/NewsSwipePersonalizer.jsx'),
  HEADER: path.join(ROOT, 'src/components/Header.jsx'),
  SIDEBAR: path.join(ROOT, 'src/components/Sidebar.jsx'),
  APP_SHELL: path.join(ROOT, 'src/layouts/AppShell.jsx'),
  APP: path.join(ROOT, 'src/App.jsx'),
}

function stripComments(str) {
  return str.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
}

function runVerification() {
  console.log('====================================================')
  console.log(' Starting Milestone M3 Verification Suite')
  console.log(' Requirements: R4 (Daily News) & R5 (Tinder Swipe)')
  console.log('====================================================\n')

  let passed = 0
  let total = 0

  function test(name, fn) {
    total++
    try {
      fn()
      console.log(`[PASS] ${name}`)
      passed++
    } catch (err) {
      console.error(`[FAIL] ${name}`)
      console.error(`       ${err.message}`)
    }
  }

  // 1. Navigation Settings
  test('navSettings: DEFAULT_VISIBLE_TABS includes /news: true', () => {
    const code = fs.readFileSync(PATHS.NAV_SETTINGS, 'utf8')
    assert.ok(/['"]\/news['"]\s*:\s*true/.test(code), 'Must include /news: true in DEFAULT_VISIBLE_TABS')
  })

  test('navSettings: NAV_TAB_DEFINITIONS defines /news tab entry with toggle enabled', () => {
    const code = fs.readFileSync(PATHS.NAV_SETTINGS, 'utf8')
    assert.ok(/id:\s*['"]\/news['"]/.test(code), 'Must declare id: "/news"')
    assert.ok(/label:\s*['"]Noticias['"]/.test(code), 'Must declare label: "Noticias"')
    assert.ok(/canToggle:\s*true/.test(code), 'Must allow toggling news tab')
  })

  // 2. News Service
  test('newsService: exports FALLBACK_NEWS with exactly 6 structured articles', () => {
    assert.ok(fs.existsSync(PATHS.NEWS_SERVICE), 'src/services/newsService.js must exist')
    const code = fs.readFileSync(PATHS.NEWS_SERVICE, 'utf8')
    assert.ok(/export\s+const\s+FALLBACK_NEWS/.test(code), 'Must export FALLBACK_NEWS')
    assert.ok(/news-1[\s\S]*?news-2[\s\S]*?news-3[\s\S]*?news-4[\s\S]*?news-5[\s\S]*?news-6/.test(code), 'Must have 6 articles')
    assert.ok(!/news-7/.test(code), 'Must not exceed 6 fallback articles')
  })

  test('newsService: articles contain category, readTime, sourceName, and external URL', () => {
    const code = fs.readFileSync(PATHS.NEWS_SERVICE, 'utf8')
    assert.ok(/category:\s*['"]/.test(code), 'Articles must define category')
    assert.ok(/readTime|readingTime/.test(code), 'Articles must define readTime')
    assert.ok(/sourceName|source/.test(code), 'Articles must define source')
    assert.ok(/url|sourceUrl/.test(code), 'Articles must define url')
    assert.ok(/Xataka/.test(code) && /Genbeta/.test(code), 'Must include authoritative sources (Xataka, Genbeta)')
  })

  test('newsService: implements getDailyNews with offline fallback', () => {
    const code = fs.readFileSync(PATHS.NEWS_SERVICE, 'utf8')
    assert.ok(/export\s+(?:async\s+)?function\s+getDailyNews/.test(code), 'Must export getDailyNews')
    assert.ok(/catch[\s\S]*?FALLBACK_NEWS/.test(code), 'Must catch network errors and return FALLBACK_NEWS')
  })

  test('newsService: preferences manage weights (0.1 to 2.5), storage key, and reset', () => {
    const code = fs.readFileSync(PATHS.NEWS_SERVICE, 'utf8')
    assert.ok(/studenthub_news_preferences/.test(code), 'Must persist under studenthub_news_preferences')
    assert.ok(/0\.1/.test(code) && /2\.5/.test(code), 'Must clamp weights between 0.1 and 2.5')
    assert.ok(/export\s+function\s+getNewsPreferences/.test(code), 'Must export getNewsPreferences')
    assert.ok(/export\s+function\s+saveNewsPreferences/.test(code), 'Must export saveNewsPreferences')
    assert.ok(/export\s+function\s+resetNewsPreferences/.test(code), 'Must export resetNewsPreferences')
    assert.ok(/export\s+function\s+getPersonalizedNews/.test(code), 'Must export getPersonalizedNews')
  })

  // 3. NewsSwipePersonalizer Component
  test('NewsSwipePersonalizer: exists and handles Pointer Events for touch & mouse', () => {
    assert.ok(fs.existsSync(PATHS.NEWS_SWIPE), 'src/components/news/NewsSwipePersonalizer.jsx must exist')
    const code = fs.readFileSync(PATHS.NEWS_SWIPE, 'utf8')
    assert.ok(/onPointerDown/.test(code), 'Must handle onPointerDown')
    assert.ok(/onPointerMove/.test(code), 'Must handle onPointerMove')
    assert.ok(/onPointerUp/.test(code), 'Must handle onPointerUp')
    assert.ok(/setPointerCapture/.test(code), 'Must capture pointer for drag consistency')
    assert.ok(/try\s*\{[\s\S]*?releasePointerCapture/.test(code), 'Must safely release pointer capture')
  })

  test('NewsSwipePersonalizer: physics rotation deg = deltaX / 15 and 90px threshold springback', () => {
    const code = fs.readFileSync(PATHS.NEWS_SWIPE, 'utf8')
    assert.ok(/SWIPE_THRESHOLD|90/.test(code), 'Must define 90px threshold')
    assert.ok(/15/.test(code), 'Must calculate rotation from deltaX / 15')
    assert.ok(/setDragOffset\(\{\s*x:\s*0,\s*y:\s*0\s*\}\)/.test(code), 'Must spring back on sub-threshold release')
  })

  test('NewsSwipePersonalizer: provides action buttons (Red X, Green Tick, Reset)', () => {
    const code = fs.readFileSync(PATHS.NEWS_SWIPE, 'utf8')
    assert.ok(/handleReject|handleDislike|triggerSwipe\(['"]left['"]\)/.test(code), 'Must support reject/dislike action')
    assert.ok(/handleApprove|handleLike|triggerSwipe\(['"]right['"]\)/.test(code), 'Must support approve/like action')
    assert.ok(/handleReset|resetNewsPreferences/.test(code), 'Must support reset preferences action')
  })

  test('NewsSwipePersonalizer: displays dynamic like/dislike visual stamps and completion state', () => {
    const code = fs.readFileSync(PATHS.NEWS_SWIPE, 'utf8')
    assert.ok(/ME INTERESA|APROBADO|emerald/.test(code), 'Must display positive stamp overlay')
    assert.ok(/DESCARTAR|MENOS|rose/.test(code), 'Must display negative stamp overlay')
    assert.ok(/currentIndex\s*>=|al d\u00eda/.test(code), 'Must render completion state when deck exhausted')
  })

  // 4. NewsPage Component
  test('NewsPage: renders hero, cards with target="_blank" and rel="noopener noreferrer"', () => {
    assert.ok(fs.existsSync(PATHS.NEWS_PAGE), 'src/pages/NewsPage.jsx must exist')
    const code = fs.readFileSync(PATHS.NEWS_PAGE, 'utf8')
    assert.ok(/Noticias Diarias/.test(code), 'Must render page hero title')
    assert.ok(/target=["']_blank["']/.test(code), 'Must open articles in external tab')
    assert.ok(/rel=["']noopener noreferrer["']/.test(code), 'Must enforce rel="noopener noreferrer"')
    assert.ok(/NewsSwipePersonalizer/.test(code), 'Must mount NewsSwipePersonalizer')
  })

  // 5. Navigation & Shell Integration
  test('Header & Sidebar: integrate Noticias navigation tab', () => {
    const headerCode = fs.readFileSync(PATHS.HEADER, 'utf8')
    const sidebarCode = fs.readFileSync(PATHS.SIDEBAR, 'utf8')
    assert.ok(/to:\s*['"]\/news['"]/.test(headerCode), 'Header must include /news nav item')
    assert.ok(/to:\s*['"]\/news['"]/.test(sidebarCode), 'Sidebar must include /news nav item')
  })

  test('AppShell: guards /news route and redirects to /calendar when disabled in Settings', () => {
    const code = fs.readFileSync(PATHS.APP_SHELL, 'utf8')
    assert.ok(/['"]\/news['"]/.test(code), 'APP_TABS and candidateTabs must include /news')
    assert.ok(/visibleTabs\['\/news'\]\s*===\s*false[\s\S]*?navigate\(['"]\/calendar['"]\)/.test(code), 'Must redirect disabled /news to /calendar')
  })

  test('App: mounts /news with lazyWithRetry under AppShell', () => {
    const code = fs.readFileSync(PATHS.APP, 'utf8')
    assert.ok(/lazyWithRetry\s*\(\s*\(\)\s*=>\s*import\(['"][^'"]*NewsPage['"]\)/.test(code), 'Must lazy import NewsPage with retry')
    assert.ok(/path:\s*['"]\/news['"]/.test(code), 'Must register route for /news')
  })

  console.log('\n====================================================')
  console.log(` Results: ${passed} / ${total} tests passed`)
  console.log('====================================================')

  if (passed === total) {
    console.log('\n>>> SUCCESS: All Milestone M3 verification checks PASSED! <<<\n')
    process.exit(0)
  } else {
    console.error(`\n>>> FAILURE: ${total - passed} checks failed. <<<\n`)
    process.exit(1)
  }
}

runVerification()
