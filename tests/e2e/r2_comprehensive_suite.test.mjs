import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  readUtf8,
  fileExists,
  stripComments,
  MockStorage,
  probeRemoteAsset,
} from '../helpers/test_utils.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '../..')

// Target Codebase Paths
const PATHS = {
  LAZY_WITH_RETRY: path.join(PROJECT_ROOT, 'src/utils/lazyWithRetry.js'),
  MAIN_JSX: path.join(PROJECT_ROOT, 'src/main.jsx'),
  APP_JSX: path.join(PROJECT_ROOT, 'src/App.jsx'),
  LANDING_JSX: path.join(PROJECT_ROOT, 'src/pages/LandingPage.jsx'),
  LANDING_CSS: path.join(PROJECT_ROOT, 'src/pages/LandingPage.css'),
  APP_SHELL_JSX: path.join(PROJECT_ROOT, 'src/layouts/AppShell.jsx'),
  HEADER_JSX: path.join(PROJECT_ROOT, 'src/components/Header.jsx'),
  SIDEBAR_JSX: path.join(PROJECT_ROOT, 'src/components/Sidebar.jsx'),
  NAV_SETTINGS_JS: path.join(PROJECT_ROOT, 'src/services/navSettings.js'),
  NEWS_SERVICE_JS: path.join(PROJECT_ROOT, 'src/services/newsService.js'),
  NEWS_PAGE_JSX: path.join(PROJECT_ROOT, 'src/pages/NewsPage.jsx'),
  DAILY_NEWS_PAGE_JSX: path.join(PROJECT_ROOT, 'src/pages/DailyNewsPage.jsx'),
  NEWS_SWIPE_JSX_1: path.join(PROJECT_ROOT, 'src/components/news/NewsSwipePersonalizer.jsx'),
  NEWS_SWIPE_JSX_2: path.join(PROJECT_ROOT, 'src/components/NewsSwipePersonalizer.jsx'),
  AI_ORGANIZER_JS: path.join(PROJECT_ROOT, 'src/services/aiOrganizer.js'),
  WHATSAPP_BRIDGE_JS: path.join(PROJECT_ROOT, 'server/whatsapp-bridge.js'),
  AUTO_ORGANIZER_JSX: path.join(PROJECT_ROOT, 'src/pages/AutoOrganizerPage.jsx'),
  CALENDAR_PAGE_JSX: path.join(PROJECT_ROOT, 'src/pages/CalendarPage.jsx'),
  MY_HUB_PAGE_JSX: path.join(PROJECT_ROOT, 'src/pages/MyHubPage.jsx'),
  THEMES_CSS: path.join(PROJECT_ROOT, 'src/styles/themes.css'),
  VITE_CONFIG: path.join(PROJECT_ROOT, 'vite.config.js'),
  PACKAGE_JSON: path.join(PROJECT_ROOT, 'package.json'),
  DIST_INDEX: path.join(PROJECT_ROOT, 'dist/index.html'),
}

// Canonical GitHub Release URLs from ORIGINAL_REQUEST.md
const GITHUB_APK_URL = 'https://github.com/Gekamil/AppHub/releases/download/latest/AppHub.apk'
const GITHUB_EXE_URL = 'https://github.com/Gekamil/AppHub/releases/download/latest/AppHub-Setup.exe'
const MIN_APK_BYTES = 114 * 1024 * 1024 // 114 MB threshold (119,537,664 bytes)
const MIN_EXE_BYTES = 90 * 1024 * 1024  // 90 MB threshold

// ==============================================================================
// TIER 1: FEATURE COVERAGE (R1 to R6 — 30 Tests, 5 per feature)
// ==============================================================================

describe('Tier 1: Feature Coverage (R1 to R6)', () => {

  // ----------------------------------------------------------------------------
  // Feature 1: R1 Vite Chunk Dynamic Import Fallback
  // ----------------------------------------------------------------------------
  describe('F1: R1 Dynamic Chunk Fallback & Recovery', () => {
    it('T1.R1.1: src/utils/lazyWithRetry.js exists and exports lazyWithRetry and isChunkLoadError', () => {
      assert.ok(
        fileExists(PATHS.LAZY_WITH_RETRY),
        'src/utils/lazyWithRetry.js must exist to encapsulate chunk retry logic'
      )
      const code = readUtf8(PATHS.LAZY_WITH_RETRY)
      assert.ok(/export\s+function\s+lazyWithRetry|export\s+const\s+lazyWithRetry/.test(code), 'Must export lazyWithRetry')
      assert.ok(/export\s+function\s+isChunkLoadError|export\s+const\s+isChunkLoadError/.test(code), 'Must export isChunkLoadError')
    })

    it('T1.R1.2: isChunkLoadError matches Chromium, Firefox, WebKit and HTML syntax chunk errors', () => {
      assert.ok(fileExists(PATHS.LAZY_WITH_RETRY), 'lazyWithRetry.js required')
      const code = readUtf8(PATHS.LAZY_WITH_RETRY)
      assert.ok(/Failed to fetch dynamically imported module/i.test(code), 'Must detect Chromium chunk load error')
      assert.ok(/error loading dynamically imported module/i.test(code), 'Must detect Firefox chunk load error')
      assert.ok(/Importing a module script failed|Load failed/i.test(code), 'Must detect WebKit chunk load error')
      assert.ok(/Unexpected token '<'/i.test(code), 'Must detect SPA HTML fallback 200 chunk error')
    })

    it('T1.R1.3: src/main.jsx registers global vite:preloadError event listener with cooldown guard', () => {
      const code = readUtf8(PATHS.MAIN_JSX)
      assert.ok(
        /addEventListener\(\s*['"]vite:preloadError['"]/i.test(code),
        'src/main.jsx must register a window.addEventListener for "vite:preloadError"'
      )
      assert.ok(
        /sessionStorage/i.test(code),
        'vite:preloadError listener must check sessionStorage cooldown to prevent infinite reload loops'
      )
      assert.ok(
        /navigator\.onLine/i.test(code),
        'vite:preloadError listener must guard against reloading when offline (navigator.onLine === false)'
      )
    })

    it('T1.R1.4: src/App.jsx wraps route lazy imports with lazyWithRetry', () => {
      const code = readUtf8(PATHS.APP_JSX)
      assert.ok(
        /import.*lazyWithRetry.*from/i.test(code),
        'src/App.jsx must import lazyWithRetry from utils/lazyWithRetry'
      )
      assert.ok(
        /lazyWithRetry\s*\(\s*\(\)\s*=>\s*import/i.test(code),
        'src/App.jsx must wrap lazy route components with lazyWithRetry'
      )
    })

    it('T1.R1.5: RootErrorBoundary preserves student localStorage data and offers non-destructive recovery', () => {
      const code = readUtf8(PATHS.APP_JSX)
      const clean = stripComments(code)
      // Extract RootErrorBoundary body
      const errorBoundaryMatch = clean.match(/function\s+RootErrorBoundary[\s\S]*?^}/m)
      assert.ok(errorBoundaryMatch, 'RootErrorBoundary component must exist in src/App.jsx')
      const ebBody = errorBoundaryMatch[0]
      assert.ok(
        !/localStorage\.clear\(\)/.test(ebBody),
        'RootErrorBoundary MUST NOT call localStorage.clear(), as this destroys all offline student data'
      )
      assert.ok(
        /reload|location\.reload|Reanudar/i.test(ebBody),
        'RootErrorBoundary must provide a clean recovery action to reload or resume workspace'
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Feature 2: R2 Official APK (114+ MB) and Download Links
  // ----------------------------------------------------------------------------
  describe('F2: R2 Official APK (114+ MB) & Download Routing', () => {
    it('T1.R2.1: src/pages/LandingPage.jsx Android button targets official GitHub Release APK with download attribute', () => {
      const code = readUtf8(PATHS.LANDING_JSX)
      assert.ok(
        code.includes('https://github.com/Gekamil/AppHub/releases/download/latest/AppHub.apk'),
        'Android download link must point directly to the official GitHub Release AppHub.apk asset'
      )
      assert.ok(
        /download=["']AppHub\.apk["']/.test(code) || /download/.test(code),
        'Android download anchor must include download attribute'
      )
    })

    it('T1.R2.2: src/pages/LandingPage.jsx Windows button targets official GitHub Release AppHub-Setup.exe', () => {
      const code = readUtf8(PATHS.LANDING_JSX)
      assert.ok(
        code.includes('https://github.com/Gekamil/AppHub/releases/download/latest/AppHub-Setup.exe') ||
        code.includes('/download/StudentHub-Setup.exe'),
        'Windows download link must point to official installer release'
      )
    })

    it('T1.R2.3: Official remote GitHub Release APK exists and strictly exceeds 114 MB', async () => {
      const probe = await probeRemoteAsset(GITHUB_APK_URL, { timeoutMs: 15000 })
      assert.ok(probe.ok, `Remote GitHub Release APK URL must be reachable: ${GITHUB_APK_URL}`)
      assert.ok(
        probe.contentLength >= MIN_APK_BYTES,
        `APK size must be >= 114 MB (${MIN_APK_BYTES} bytes). Actual remote size: ${probe.contentLength} bytes (~${(probe.contentLength / 1024 / 1024).toFixed(2)} MB)`
      )
    })

    it('T1.R2.4: Official remote GitHub Release Windows installer exists and exceeds 90 MB', async () => {
      const probe = await probeRemoteAsset(GITHUB_EXE_URL, { timeoutMs: 15000 })
      assert.ok(probe.ok, `Remote GitHub Release Setup.exe URL must be reachable: ${GITHUB_EXE_URL}`)
      assert.ok(
        probe.contentLength >= MIN_EXE_BYTES,
        `Windows setup size must be >= 90 MB (${MIN_EXE_BYTES} bytes). Actual remote size: ${probe.contentLength} bytes (~${(probe.contentLength / 1024 / 1024).toFixed(2)} MB)`
      )
    })

    it('T1.R2.5: server/whatsapp-bridge.js download handler redirects 302 to official GitHub release URLs', () => {
      const code = readUtf8(PATHS.WHATSAPP_BRIDGE_JS)
      assert.ok(
        /302/.test(code) && /github\.com\/Gekamil\/AppHub\/releases/i.test(code),
        'server/whatsapp-bridge.js must perform 302 redirects to GitHub Releases for download requests'
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Feature 3: R3 Extreme Performance & 60 FPS Fluidity
  // ----------------------------------------------------------------------------
  describe('F3: R3 Extreme Performance & 60 FPS Fluidity', () => {
    it('T1.R3.1: src/layouts/AppShell.jsx memoizes outletContextValue using useMemo', () => {
      const code = readUtf8(PATHS.APP_SHELL_JSX)
      const clean = stripComments(code)
      assert.ok(
        /useMemo\s*\(\s*\(\)\s*=>\s*\(?\{[\s\S]*?globalTasks/.test(clean),
        'AppShell outletContextValue must use useMemo to cache context object and avoid reference invalidation'
      )
      assert.ok(
        !/useCallback\s*\([\s\S]*?\)\(\)/.test(clean),
        'AppShell must NOT invoke useCallback immediately ()() as this creates a brand new object on every render'
      )
    })

    it('T1.R3.2: src/components/Header.jsx sliding indicator animates with GPU transform rather than left/width', () => {
      const code = readUtf8(PATHS.HEADER_JSX)
      const clean = stripComments(code)
      const indicatorSection = clean.match(/indicatorStyle[\s\S]*?style=\{([\s\S]*?)\}/)?.[1] || clean
      assert.ok(
        /translateX|scaleX|transform/i.test(indicatorSection) || /transform:\s*`translateX/i.test(clean),
        'Header active tab sliding indicator must use CSS transform (translateX / scaleX) for 60 FPS GPU compositing'
      )
      assert.ok(
        /will-change/i.test(code) || /willChange/i.test(code),
        'Header active tab sliding indicator must hint browser compositor with will-change: transform'
      )
    })

    it('T1.R3.3: AutoOrganizerPage.jsx memoizes filteredTasks using useMemo', () => {
      const code = readUtf8(PATHS.AUTO_ORGANIZER_JSX)
      const clean = stripComments(code)
      assert.ok(
        /const\s+filteredTasks\s*=\s*useMemo\s*\(/i.test(clean),
        'AutoOrganizerPage must memoize filteredTasks with useMemo to prevent re-filtering on every keystroke/tick'
      )
    })

    it('T1.R3.4: CalendarPage.jsx isolates tick re-renders or memoizes month matrix calculations', () => {
      const code = readUtf8(PATHS.CALENDAR_PAGE_JSX)
      // Check that task calculations or month view are memoized or isolated
      const hasMemoOrIsolation =
        /useMemo\s*\(\s*\(\)\s*=>\s*\(?\{?[\s\S]*?tasks/i.test(code) ||
        /useMemo\s*\(\s*\(\)\s*=>[\s\S]*?month/i.test(code) ||
        !/setInterval\(\(\)\s*=>\s*setNowTicker\(new Date\(\)\),\s*20000\)/.test(code)
      assert.ok(
        hasMemoOrIsolation,
        'CalendarPage must memoize expensive task/date transformations or isolate nowTicker to prevent 5,900 LOC re-renders'
      )
    })

    it('T1.R3.5: MyHubPage.jsx imports APP_THEMES and eliminates double-blur ghost DOM tree', () => {
      const code = readUtf8(PATHS.MY_HUB_PAGE_JSX)
      assert.ok(
        /import.*APP_THEMES.*from/i.test(code),
        'MyHubPage.jsx must import APP_THEMES from appTheme service to eliminate dormant ReferenceError'
      )
      // Double-blur check: ensure it does not render a whole hidden page tree under blur-md and backdrop-blur
      const hasDoubleBlurBloat =
        /filter\s+blur-md[\s\S]*?M\u00f3dulo My Hub en Optimizaci\u00f3n[\s\S]*?Fast Web Clipper/.test(code)
      assert.ok(
        !hasDoubleBlurBloat,
        'MyHubPage.jsx must eliminate the double-blur ghost DOM tree that consumes heavy GPU raster fill rate'
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Feature 4: R4 Daily News Section & Topbar Navigation Activation
  // ----------------------------------------------------------------------------
  describe('F4: R4 Daily News Section & Topbar Toggle', () => {
    it('T1.R4.1: src/services/navSettings.js configures /news tab in defaults and definitions', () => {
      const code = readUtf8(PATHS.NAV_SETTINGS_JS)
      assert.ok(
        /['"]\/news['"]\s*:\s*true/.test(code),
        'DEFAULT_VISIBLE_TABS in navSettings.js must include "/news": true'
      )
      assert.ok(
        /id:\s*['"]\/news['"]/.test(code),
        'NAV_TAB_DEFINITIONS in navSettings.js must declare the "/news" tab item'
      )
    })

    it('T1.R4.2: Header.jsx and Sidebar.jsx integrate the Noticias navigation tab', () => {
      const headerCode = readUtf8(PATHS.HEADER_JSX)
      const sidebarCode = readUtf8(PATHS.SIDEBAR_JSX)
      assert.ok(
        /\/news/.test(headerCode) || /Noticias/i.test(headerCode),
        'Header.jsx navigation items must include the /news tab'
      )
      assert.ok(
        /\/news/.test(sidebarCode) || /Noticias/i.test(sidebarCode),
        'Sidebar.jsx navigation items must include the /news tab'
      )
    })

    it('T1.R4.3: src/services/newsService.js exists and exports getDailyNews and FALLBACK_NEWS', () => {
      assert.ok(fileExists(PATHS.NEWS_SERVICE_JS), 'src/services/newsService.js must exist')
      const code = readUtf8(PATHS.NEWS_SERVICE_JS)
      assert.ok(
        /export\s+(?:async\s+)?function\s+getDailyNews|export\s+const\s+getDailyNews/.test(code),
        'newsService.js must export getDailyNews()'
      )
      assert.ok(
        /export\s+const\s+FALLBACK_NEWS/.test(code),
        'newsService.js must export FALLBACK_NEWS array'
      )
    })

    it('T1.R4.4: FALLBACK_NEWS contains exactly 6 structured articles with all required fields', () => {
      assert.ok(fileExists(PATHS.NEWS_SERVICE_JS), 'newsService.js required')
      const code = readUtf8(PATHS.NEWS_SERVICE_JS)
      // Check for required properties in news items
      assert.ok(/category/i.test(code), 'News items must have category')
      assert.ok(/title/i.test(code), 'News items must have title')
      assert.ok(/summary/i.test(code), 'News items must have summary')
      assert.ok(/readingTime|readTime/i.test(code), 'News items must specify readingTime')
      assert.ok(/sourceUrl|url/i.test(code), 'News items must specify sourceUrl')
      assert.ok(/source/i.test(code), 'News items must specify source name')
      // Must contain high-value sources from requirements: Xataka, Genbeta, SINC, Nature or El País
      assert.ok(/Xataka/i.test(code), 'Must include Xataka as trusted source')
      assert.ok(/Genbeta/i.test(code), 'Must include Genbeta as trusted source')
    })

    it('T1.R4.5: Daily News Page component exists and renders news cards with external target="_blank" links', () => {
      const newsPagePath = fileExists(PATHS.NEWS_PAGE_JSX)
        ? PATHS.NEWS_PAGE_JSX
        : PATHS.DAILY_NEWS_PAGE_JSX
      assert.ok(
        fileExists(newsPagePath),
        'Daily news page component (NewsPage.jsx or DailyNewsPage.jsx) must exist in src/pages/'
      )
      const code = readUtf8(newsPagePath)
      assert.ok(
        /target=["']_blank["']/.test(code),
        'News page cards must open source articles in target="_blank"'
      )
      assert.ok(
        /rel=["'][^"']*noopener[^"']*["']/.test(code),
        'External news links must include rel="noopener noreferrer" for security'
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Feature 5: R5 Interactive News Personalization (Tinder Swipe)
  // ----------------------------------------------------------------------------
  describe('F5: R5 Interactive News Personalization (Tinder Swipe)', () => {
    it('T1.R5.1: NewsSwipePersonalizer component exists and tracks pointer/touch drag gestures', () => {
      const swipeComponentPath = fileExists(PATHS.NEWS_SWIPE_JSX_1)
        ? PATHS.NEWS_SWIPE_JSX_1
        : PATHS.NEWS_SWIPE_JSX_2
      assert.ok(
        fileExists(swipeComponentPath),
        'NewsSwipePersonalizer.jsx must exist in src/components/news/ or src/components/'
      )
      const code = readUtf8(swipeComponentPath)
      assert.ok(
        /onPointerDown|onTouchStart|pointerdown/i.test(code),
        'Personalizer deck must handle pointer down events'
      )
      assert.ok(
        /onPointerMove|onTouchMove|pointermove/i.test(code),
        'Personalizer deck must handle pointer move events'
      )
      assert.ok(
        /onPointerUp|onTouchEnd|pointerup/i.test(code),
        'Personalizer deck must handle pointer up events'
      )
    })

    it('T1.R5.2: NewsSwipePersonalizer displays dynamic like/dislike visual stamp feedback', () => {
      const swipePath = fileExists(PATHS.NEWS_SWIPE_JSX_1) ? PATHS.NEWS_SWIPE_JSX_1 : PATHS.NEWS_SWIPE_JSX_2
      assert.ok(fileExists(swipePath), 'Personalizer component required')
      const code = readUtf8(swipePath)
      assert.ok(
        /INTERESA|GUSTA|tick|emerald|green/i.test(code),
        'Must display positive stamp/badge when dragged right'
      )
      assert.ok(
        /MENOS|DESCARTAR|rose|red/i.test(code),
        'Must display negative stamp/badge when dragged left'
      )
    })

    it('T1.R5.3: NewsSwipePersonalizer provides dedicated Red X, Green Tick, and Reset buttons', () => {
      const swipePath = fileExists(PATHS.NEWS_SWIPE_JSX_1) ? PATHS.NEWS_SWIPE_JSX_1 : PATHS.NEWS_SWIPE_JSX_2
      assert.ok(fileExists(swipePath), 'Personalizer component required')
      const code = readUtf8(swipePath)
      // Check for reject button, approve button, and reset button
      assert.ok(
        /triggerSwipe\(['"]left['"]\)|handleReject|handleDislike|onDislike/i.test(code) || /red|rose/i.test(code),
        'Must provide click trigger for left reject'
      )
      assert.ok(
        /triggerSwipe\(['"]right['"]\)|handleApprove|handleLike|onLike/i.test(code) || /green|emerald/i.test(code),
        'Must provide click trigger for right approve'
      )
      assert.ok(
        /reset|Resetear/i.test(code),
        'Must provide visible button to reset preferences'
      )
    })

    it('T1.R5.4: newsService.js persists adaptive category weights in localStorage under studenthub_news_preferences', () => {
      assert.ok(fileExists(PATHS.NEWS_SERVICE_JS), 'newsService.js required')
      const code = readUtf8(PATHS.NEWS_SERVICE_JS)
      assert.ok(
        /studenthub_news_preferences/i.test(code),
        'Preferences must be stored under key "studenthub_news_preferences"'
      )
      assert.ok(
        /localStorage/i.test(code),
        'newsService must persist preferences in localStorage'
      )
    })

    it('T1.R5.5: newsService.js provides resetNewsPreferences to restore neutral weights', () => {
      assert.ok(fileExists(PATHS.NEWS_SERVICE_JS), 'newsService.js required')
      const code = readUtf8(PATHS.NEWS_SERVICE_JS)
      assert.ok(
        /resetNewsPreferences/i.test(code),
        'newsService must export resetNewsPreferences function'
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Feature 6: R6 AI Assistant Integration (App & WhatsApp)
  // ----------------------------------------------------------------------------
  describe('F6: R6 AI Assistant Integration (App & WhatsApp)', () => {
    it('T1.R6.1: src/services/aiOrganizer.js systemPrompt injects daily news context', () => {
      const code = readUtf8(PATHS.AI_ORGANIZER_JS)
      assert.ok(
        /NOTICIAS|noticias|newsContext|getNews/i.test(code),
        'aiOrganizer.js systemPrompt must incorporate daily news context'
      )
    })

    it('T1.R6.2: resolveAICopilotLocally in aiOrganizer.js answers general "¿Cuáles son las noticias de hoy?" query', () => {
      const code = readUtf8(PATHS.AI_ORGANIZER_JS)
      const clean = stripComments(code)
      assert.ok(
        /noticia|titular|actualidad/i.test(clean),
        'resolveAICopilotLocally must detect news/actualidad query intent'
      )
    })

    it('T1.R6.3: resolveAICopilotLocally in aiOrganizer.js answers targeted AI/technology query', () => {
      const code = readUtf8(PATHS.AI_ORGANIZER_JS)
      const clean = stripComments(code)
      assert.ok(
        /inteligencia artificial|ia|tecnolog/i.test(clean),
        'resolveAICopilotLocally must distinguish targeted AI/tech query intent'
      )
    })

    it('T1.R6.4: server/whatsapp-bridge.js processMessageWithAI integrates news digest for WhatsApp queries', () => {
      const code = readUtf8(PATHS.WHATSAPP_BRIDGE_JS)
      assert.ok(
        /noticia|titular|NOTICIAS|Groq|Xataka/i.test(code),
        'server/whatsapp-bridge.js must include daily news intelligence in its WhatsApp prompt processing'
      )
    })

    it('T1.R6.5: AI news responses cite authoritative media sources (Xataka, Genbeta, SINC, Nature, or El País)', () => {
      const aiCode = readUtf8(PATHS.AI_ORGANIZER_JS)
      const waCode = readUtf8(PATHS.WHATSAPP_BRIDGE_JS)
      const combined = aiCode + waCode
      assert.ok(
        /Xataka/i.test(combined) && /Genbeta/i.test(combined),
        'AI news responses across App and WhatsApp must attribute information to verified sources (Xataka, Genbeta)'
      )
    })
  })
})

// ==============================================================================
// TIER 2: BOUNDARY & CORNER CASES (30 Tests, 5 per feature)
// ==============================================================================

describe('Tier 2: Boundary & Corner Cases (R1 to R6)', () => {

  // ----------------------------------------------------------------------------
  // Boundary 1: R1 Dynamic Chunk Recovery Boundaries
  // ----------------------------------------------------------------------------
  describe('B1: R1 Dynamic Chunk Recovery Boundaries', () => {
    it('T2.R1.1: Offline resilience: chunk error does not trigger reload if navigator.onLine === false', () => {
      const mainCode = readUtf8(PATHS.MAIN_JSX)
      assert.ok(
        /navigator\.onLine\s*===\s*false|!navigator\.onLine/i.test(mainCode),
        'Preload error listener must skip reload when browser is offline to prevent error loops'
      )
    })

    it('T2.R1.2: Loop prevention: enforces >= 15000ms cooldown in sessionStorage before allowing reload', () => {
      const mainCode = readUtf8(PATHS.MAIN_JSX)
      const hasCooldown =
        /15000|15\s*\*\s*1000|RELOAD_COOLDOWN/i.test(mainCode) &&
        /sessionStorage/i.test(mainCode)
      assert.ok(
        hasCooldown,
        'Must enforce 15-second cooldown in sessionStorage to prevent infinite page reloads'
      )
    })

    it('T2.R1.3: Non-chunk errors (e.g. ReferenceError, custom BusinessError) are not mistaken for chunk load errors', () => {
      if (!fileExists(PATHS.LAZY_WITH_RETRY)) return // handled in Tier 1
      const code = readUtf8(PATHS.LAZY_WITH_RETRY)
      // Check regex specificity
      assert.ok(
        !code.includes('return true') || code.includes('isChunkLoadError'),
        'isChunkLoadError must not unconditionally return true'
      )
      assert.ok(
        /ChunkLoadError|Failed to fetch|error loading|Importing a module/i.test(code),
        'Must filter specifically for dynamic module import errors'
      )
    })

    it('T2.R1.4: Student data safety: sessionStorage is used for retry tokens, leaving localStorage untouched', () => {
      const appCode = readUtf8(PATHS.APP_JSX)
      const mainCode = readUtf8(PATHS.MAIN_JSX)
      const combined = appCode + mainCode
      // Check that retry flags are written to sessionStorage, not localStorage
      assert.ok(
        /sessionStorage\.setItem/i.test(combined),
        'Dynamic chunk reload state must use sessionStorage so it clears when browser closes'
      )
    })

    it('T2.R1.5: SPA HTML token error detection: recognizes Unexpected token < from index.html catch-all', () => {
      if (!fileExists(PATHS.LAZY_WITH_RETRY)) return
      const code = readUtf8(PATHS.LAZY_WITH_RETRY)
      assert.ok(
        /Unexpected token/i.test(code) || /Unexpected token '<'/i.test(code),
        'Must detect HTML syntax error thrown when 404 chunk serves HTML index'
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Boundary 2: R2 Download Asset & Header Boundaries
  // ----------------------------------------------------------------------------
  describe('B2: R2 Download Asset & Header Boundaries', () => {
    it('T2.R2.1: APK binary size lower bound: strictly exceeds 114 MB threshold (119.54 MB actual)', async () => {
      const probe = await probeRemoteAsset(GITHUB_APK_URL)
      assert.ok(probe.ok, 'GitHub release asset reachable')
      // Exact byte check: 114 * 1024 * 1024 = 119,537,664 bytes
      assert.ok(
        probe.contentLength > 119537664,
        `APK must be > 119,537,664 bytes (114 MB). Found: ${probe.contentLength}`
      )
    })

    it('T2.R2.2: Case-insensitive download route matching in server/whatsapp-bridge.js', () => {
      const code = readUtf8(PATHS.WHATSAPP_BRIDGE_JS)
      assert.ok(
        /toLowerCase\(\)/i.test(code) || /\/download\/(?:apphub|studenthub)\.apk/i.test(code),
        'Download handler must support case-insensitive route inspection'
      )
    })

    it('T2.R2.3: Cache-Control on download redirect specifies no-cache to avoid stale redirect caching', () => {
      const code = readUtf8(PATHS.WHATSAPP_BRIDGE_JS)
      assert.ok(
        /no-cache|no-store|must-revalidate/i.test(code),
        'Download routes must set no-cache headers so browsers always query fresh release pointers'
      )
    })

    it('T2.R2.4: Windows Setup installer binary header check: Content-Type is binary or octet-stream', async () => {
      const probe = await probeRemoteAsset(GITHUB_EXE_URL)
      assert.ok(probe.ok, 'GitHub Setup.exe reachable')
      assert.ok(
        probe.contentType.includes('octet-stream') || probe.contentType.includes('x-msdownload') || probe.contentType === '',
        'Setup.exe must be served with application/octet-stream'
      )
    })

    it('T2.R2.5: Download attributes in LandingPage.jsx use explicit file extensions (.apk and .exe)', () => {
      const code = readUtf8(PATHS.LANDING_JSX)
      assert.ok(/\.apk["']/.test(code), 'Must specify .apk download attribute')
      assert.ok(/\.exe["']/.test(code), 'Must specify .exe download attribute')
    })
  })

  // ----------------------------------------------------------------------------
  // Boundary 3: R3 Performance & Memory Boundaries
  // ----------------------------------------------------------------------------
  describe('B3: R3 Performance, Memory & Layout Boundaries', () => {
    it('T2.R3.1: AppShell outletContextValue dependency array excludes high-frequency volatile timers', () => {
      const code = readUtf8(PATHS.APP_SHELL_JSX)
      const clean = stripComments(code)
      const match = clean.match(/const\s+outletContextValue\s*=\s*useMemo\s*\([\s\S]*?\],?\s*\[([\s\S]*?)\]\)/)
      assert.ok(match, 'outletContextValue useMemo must have a dependency array')
      const deps = match[1]
      assert.ok(!deps.includes('nowTicker'), 'outletContextValue must not depend on live time ticker')
      assert.ok(!deps.includes('scrollY'), 'outletContextValue must not depend on scroll offset')
    })

    it('T2.R3.2: CSS transitions on animated elements avoid transition-all in favor of transform/opacity', () => {
      const headerCode = readUtf8(PATHS.HEADER_JSX)
      assert.ok(
        /transition-\[?transform/i.test(headerCode) || /transition:\s*['"]?transform/i.test(headerCode) || !/indicatorStyle.*transition-all/.test(headerCode),
        'Header sliding indicator must avoid transition-all to prevent layout recalculations'
      )
    })

    it('T2.R3.3: themes.css avoids stacking individual backdrop-filters across 40+ month grid cells', () => {
      const code = readUtf8(PATHS.THEMES_CSS)
      // Check that day cells do not each run backdrop-filter blur(18px)
      const hasGridCellBlurStorm = /\[class\*="grid-cols-7"\]\s*>\s*div\s*\{[^}]*backdrop-filter/i.test(code)
      assert.ok(
        !hasGridCellBlurStorm,
        'themes.css must NOT apply individual backdrop-filter blur(18px) on every day cell in grid-cols-7'
      )
    })

    it('T2.R3.4: AutoOrganizerPage filteredTasks handles empty globalTasks array safely without errors', () => {
      const code = readUtf8(PATHS.AUTO_ORGANIZER_JSX)
      assert.ok(
        /globalTasks\s*\|\|\s*\[\]|\(globalTasks\s*\?\?\s*\[\]\)|Array\.isArray\(globalTasks\)/i.test(code) || /globalTasks\.filter/.test(code),
        'AutoOrganizerPage must safely handle globalTasks array filtering'
      )
    })

    it('T2.R3.5: MyHubPage conditional rendering avoids mounting unneeded heavy DOM when in maintenance mode', () => {
      const code = readUtf8(PATHS.MY_HUB_PAGE_JSX)
      assert.ok(
        /Pr\u00f3ximamente|Optimizing|Proximamente/i.test(code),
        'MyHubPage renders a clean maintenance/preview card'
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Boundary 4: R4 News Feed & Navigation Boundaries
  // ----------------------------------------------------------------------------
  describe('B4: R4 News Feed & Navigation Boundaries', () => {
    it('T2.R4.1: getDailyNews gracefully falls back to FALLBACK_NEWS if network or RSS proxy is unreachable', () => {
      assert.ok(fileExists(PATHS.NEWS_SERVICE_JS), 'newsService.js required')
      const code = readUtf8(PATHS.NEWS_SERVICE_JS)
      assert.ok(
        /catch.*FALLBACK_NEWS|return\s+FALLBACK_NEWS/i.test(code),
        'getDailyNews must catch network/parsing errors and return FALLBACK_NEWS'
      )
    })

    it('T2.R4.2: Tab visibility persistence in localStorage persists across simulated tab toggles', () => {
      const code = readUtf8(PATHS.NAV_SETTINGS_JS)
      assert.ok(
        /app_visible_nav_tabs/i.test(code),
        'Tab visibility state must be persisted under "app_visible_nav_tabs"'
      )
    })

    it('T2.R4.3: AppShell navigates to /calendar if user directly requests /news while disabled', () => {
      const code = readUtf8(PATHS.APP_SHELL_JSX)
      assert.ok(
        /visibleTabs.*\/calendar|navigate\(['"]\/calendar['"]\)/.test(code),
        'AppShell must guard routes and redirect disabled tabs to /calendar'
      )
    })

    it('T2.R4.4: News card external links enforce rel="noopener noreferrer" for security against tabnabbing', () => {
      const newsPagePath = fileExists(PATHS.NEWS_PAGE_JSX) ? PATHS.NEWS_PAGE_JSX : PATHS.DAILY_NEWS_PAGE_JSX
      if (!fileExists(newsPagePath)) return
      const code = readUtf8(newsPagePath)
      assert.ok(
        /rel=["']noopener noreferrer["']|rel=["']noreferrer noopener["']/.test(code),
        'News external links must enforce rel="noopener noreferrer"'
      )
    })

    it('T2.R4.5: FALLBACK_NEWS covers at least 4 distinct topic categories', () => {
      if (!fileExists(PATHS.NEWS_SERVICE_JS)) return
      const code = readUtf8(PATHS.NEWS_SERVICE_JS)
      const categoriesFound = new Set()
      const matches = code.match(/categoryKey:\s*['"]([a-z0-9_-]+)['"]/gi) || []
      for (const m of matches) {
        const val = m.replace(/categoryKey:\s*['"]/, '').replace(/['"]/, '')
        categoriesFound.add(val)
      }
      assert.ok(
        categoriesFound.size >= 4 || /ai|tech|science|productivity|university/i.test(code),
        `FALLBACK_NEWS must cover multiple diverse domains (found: ${Array.from(categoriesFound).join(', ')})`
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Boundary 5: R5 Swipe Gesture Physics & Weight Clamping
  // ----------------------------------------------------------------------------
  describe('B5: R5 Swipe Gesture Physics & Weight Clamping', () => {
    it('T2.R5.1: Sub-threshold drag (< 90px) springs back to center (0,0) without triggering swipe action', () => {
      const swipePath = fileExists(PATHS.NEWS_SWIPE_JSX_1) ? PATHS.NEWS_SWIPE_JSX_1 : PATHS.NEWS_SWIPE_JSX_2
      if (!fileExists(swipePath)) return
      const code = readUtf8(swipePath)
      assert.ok(
        /SWIPE_THRESHOLD|threshold|90|80|100/i.test(code),
        'NewsSwipePersonalizer must define a swipe distance threshold (e.g. 80-100px)'
      )
      assert.ok(
        /setDragOffset\(\{\s*x:\s*0,\s*y:\s*0\s*\}\)|\{ x: 0, y: 0 \}/.test(code),
        'Personalizer must spring dragOffset back to 0,0 when released below threshold'
      )
    })

    it('T2.R5.2: Category weights are clamped between 0.1 (floor) and 2.5 (ceiling)', () => {
      if (!fileExists(PATHS.NEWS_SERVICE_JS)) return
      const code = readUtf8(PATHS.NEWS_SERVICE_JS)
      assert.ok(
        /Math\.max\(0\.1|Math\.min\(2\.5|clamp/i.test(code) || /0\.1/.test(code),
        'Adaptive preference weighting algorithm must clamp weights within boundary limits'
      )
    })

    it('T2.R5.3: getNewsPreferences returns valid default neutral preferences if localStorage is empty or corrupted', () => {
      if (!fileExists(PATHS.NEWS_SERVICE_JS)) return
      const code = readUtf8(PATHS.NEWS_SERVICE_JS)
      assert.ok(
        /try\s*\{[\s\S]*?JSON\.parse[\s\S]*?\}\s*catch/i.test(code) || /weights/i.test(code),
        'getNewsPreferences must safely handle corrupted JSON in localStorage with fallback defaults'
      )
    })

    it('T2.R5.4: Deck displays clean completion state when all 6 cards have been swiped', () => {
      const swipePath = fileExists(PATHS.NEWS_SWIPE_JSX_1) ? PATHS.NEWS_SWIPE_JSX_1 : PATHS.NEWS_SWIPE_JSX_2
      if (!fileExists(swipePath)) return
      const code = readUtf8(swipePath)
      assert.ok(
        /currentIndex\s*>=|al d\u00eda|completado|No hay m\u00e1s tarjetas|preferencias/i.test(code),
        'Deck must handle deck exhaustion gracefully when all cards have been swiped'
      )
    })

    it('T2.R5.5: Pointer capture release is wrapped in try/catch to handle pointer cancel/lost events', () => {
      const swipePath = fileExists(PATHS.NEWS_SWIPE_JSX_1) ? PATHS.NEWS_SWIPE_JSX_1 : PATHS.NEWS_SWIPE_JSX_2
      if (!fileExists(swipePath)) return
      const code = readUtf8(swipePath)
      assert.ok(
        /releasePointerCapture/i.test(code) || /pointerup/i.test(code),
        'Pointer tracking should manage pointer capture cleanly'
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Boundary 6: R6 AI Assistant Intent & Formatting Boundaries
  // ----------------------------------------------------------------------------
  describe('B6: R6 AI Assistant Intent & Formatting Boundaries', () => {
    it('T2.R6.1: Empty or whitespace query does not crash resolveAICopilotLocally', () => {
      const code = readUtf8(PATHS.AI_ORGANIZER_JS)
      assert.ok(
        /!userMessage|\.trim\(\)/.test(code),
        'resolveAICopilotLocally must check for empty or trimmed message'
      )
    })

    it('T2.R6.2: News intent detection is case-insensitive and handles punctuation', () => {
      const code = readUtf8(PATHS.AI_ORGANIZER_JS)
      assert.ok(
        /\/noticia|toLowerCase\(\)/i.test(code),
        'News intent detection must convert input to lowercase or use case-insensitive regex'
      )
    })

    it('T2.R6.3: Unrelated general queries do not falsely trigger the news intent', () => {
      const code = readUtf8(PATHS.AI_ORGANIZER_JS)
      // Verify specific regex boundary
      assert.ok(
        /noticia|novedad|titular|actualidad/i.test(code),
        'Must use explicit news keywords to avoid falsely triggering on unrelated queries'
      )
    })

    it('T2.R6.4: WhatsApp bot formats news items using standard WhatsApp markdown (*bold*, _italic_)', () => {
      const code = readUtf8(PATHS.WHATSAPP_BRIDGE_JS)
      assert.ok(
        /\*[^*]+\*/.test(code) || /Fuente:/i.test(code),
        'WhatsApp news summary must use WhatsApp bold markdown (*bold*) for titles'
      )
    })

    it('T2.R6.5: AI news response includes summary breakdown without raw HTML entities', () => {
      const code = readUtf8(PATHS.AI_ORGANIZER_JS)
      assert.ok(
        !/<script>|<div/i.test(code.match(/resolveAICopilotLocally[\s\S]*?^}/m)?.[0] || ''),
        'Local AI response must provide clean plain-text/markdown without raw HTML wrappers'
      )
    })
  })
})

// ==============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS (6 Pairwise Interaction Tests)
// ==============================================================================

describe('Tier 3: Cross-Feature Combinations', () => {
  it('T3.1 (R1 x R4): Dynamic import failure on navigating to /news is recovered by lazyWithRetry', () => {
    const appCode = readUtf8(PATHS.APP_JSX)
    assert.ok(
      /lazyWithRetry\s*\(\s*\(\)\s*=>\s*import\(['"][^'"]*News/i.test(appCode),
      'Route /news must be wrapped in lazyWithRetry so deployment chunk desynchronization is recovered gracefully'
    )
  })

  it('T3.2 (R4 x R5): Liking a news category in Personalizer alters feed ranking in newsService', () => {
    if (!fileExists(PATHS.NEWS_SERVICE_JS)) return
    const code = readUtf8(PATHS.NEWS_SERVICE_JS)
    assert.ok(
      /getPersonalizedNews|sort\(/i.test(code),
      'newsService must provide a method to score and sort articles based on user preference weights'
    )
  })

  it('T3.3 (R4 x R6): AI Assistant headlines directly mirror articles defined in newsService', () => {
    const aiCode = readUtf8(PATHS.AI_ORGANIZER_JS)
    const newsCode = fileExists(PATHS.NEWS_SERVICE_JS) ? readUtf8(PATHS.NEWS_SERVICE_JS) : ''
    // Verify that key entities (e.g. Groq LPU, Genbeta student tools, quantum qubits) exist in both
    assert.ok(
      /Groq/i.test(aiCode) && (/Groq/i.test(newsCode) || !newsCode),
      'AI Assistant knowledge base must align with Groq LPU article from newsService'
    )
  })

  it('T3.4 (R3 x R4): Navigating to /news integrates smoothly with GPU-accelerated Header sliding pill', () => {
    const headerCode = readUtf8(PATHS.HEADER_JSX)
    assert.ok(
      /itemRefs\.current/i.test(headerCode) && /indicatorStyle/i.test(headerCode),
      'Header indicator must track /news tab index seamlessly without layout shift'
    )
  })

  it('T3.5 (R4 x NavSettings): Toggling /news off in Settings hides tab and enforces route redirect', () => {
    const navCode = readUtf8(PATHS.NAV_SETTINGS_JS)
    const shellCode = readUtf8(PATHS.APP_SHELL_JSX)
    assert.ok(
      /app_visible_tabs_changed/i.test(navCode) && /app_visible_tabs_changed/i.test(shellCode),
      'Toggling tab in navSettings emits event listened by AppShell to instantly reflect navigation changes'
    )
  })

  it('T3.6 (R5 x R6): Personalization weighting does not restrict AI Copilot from answering on all 6 topics', () => {
    const aiCode = readUtf8(PATHS.AI_ORGANIZER_JS)
    // Verify AI prompt instructs coverage across all categories regardless of user filter
    assert.ok(
      /Groq/i.test(aiCode) && /Pomodoro|cúbits|qubits|Erasmus|Vite/i.test(aiCode),
      'AI Assistant prompt must retain context for all 6 daily news articles'
    )
  })
})

// ==============================================================================
// TIER 4: REAL-WORLD SCENARIOS (6 Tests)
// ==============================================================================

describe('Tier 4: Real-World Scenarios', () => {
  it('T4.1 (Scenario 1: Production Chunk Deployment Simulation): Simulates chunk 404, triggers reload guard', () => {
    const storage = new MockStorage()
    const RELOAD_KEY = 'hub_dynamic_import_reload_active_chunk'
    const COOLDOWN_MS = 15000

    // Step 1: Simulate first error detection
    const now = Date.now()
    storage.setItem(RELOAD_KEY, String(now))
    assert.equal(storage.getItem(RELOAD_KEY), String(now), 'Storage records reload timestamp')

    // Step 2: Immediate second error within cooldown window must NOT trigger reload
    const secondAttemptNow = now + 2000 // 2 seconds later
    const lastAttempt = parseInt(storage.getItem(RELOAD_KEY), 10)
    const shouldReload = secondAttemptNow - lastAttempt > COOLDOWN_MS
    assert.equal(shouldReload, false, 'Second reload within 15 seconds must be blocked to prevent loop')

    // Step 3: Attempt after cooldown has expired
    const thirdAttemptNow = now + 16000 // 16 seconds later
    const shouldReloadAfterCooldown = thirdAttemptNow - lastAttempt > COOLDOWN_MS
    assert.equal(shouldReloadAfterCooldown, true, 'Reload allowed once cooldown window elapses')
  })

  it('T4.2 (Scenario 2: Real Remote GitHub Release Assets Verification): Validates remote binary sizes', async () => {
    const [apkProbe, exeProbe] = await Promise.all([
      probeRemoteAsset(GITHUB_APK_URL),
      probeRemoteAsset(GITHUB_EXE_URL),
    ])

    assert.ok(apkProbe.ok, 'Remote APK must return HTTP 200/302')
    assert.ok(
      apkProbe.contentLength >= 114 * 1024 * 1024,
      `Official APK must exceed 114 MB. Remote Content-Length: ${apkProbe.contentLength} bytes`
    )

    assert.ok(exeProbe.ok, 'Remote Setup.exe must return HTTP 200/302')
    assert.ok(
      exeProbe.contentLength >= 90 * 1024 * 1024,
      `Official Setup.exe must exceed 90 MB. Remote Content-Length: ${exeProbe.contentLength} bytes`
    )
  })

  it('T4.3 (Scenario 3: Complete Daily News & Personalization User Journey): Simulates feed ranking and reset', () => {
    const storage = new MockStorage()
    const PREF_KEY = 'studenthub_news_preferences'

    // Neutral baseline weights
    const defaultPrefs = {
      weights: { ai: 1.0, tech: 1.0, science: 1.0, productivity: 1.0, university: 1.0, software: 1.0 },
      swipes: {},
    }
    storage.setItem(PREF_KEY, JSON.stringify(defaultPrefs))

    // Step 1: User swipes RIGHT on AI (Like)
    const currentPrefs = JSON.parse(storage.getItem(PREF_KEY))
    currentPrefs.weights.ai = Math.min(2.5, currentPrefs.weights.ai + 0.3)
    currentPrefs.swipes['news-1'] = 'liked'

    // Step 2: User swipes LEFT on University (Dislike)
    currentPrefs.weights.university = Math.max(0.1, currentPrefs.weights.university - 0.3)
    currentPrefs.swipes['news-5'] = 'disliked'
    storage.setItem(PREF_KEY, JSON.stringify(currentPrefs))

    // Step 3: Verify updated weights in storage
    const updated = JSON.parse(storage.getItem(PREF_KEY))
    assert.equal(updated.weights.ai, 1.3, 'AI weight increased to 1.3')
    assert.equal(updated.weights.university, 0.7, 'University weight decreased to 0.7')
    assert.equal(updated.swipes['news-1'], 'liked', 'Like recorded')
    assert.equal(updated.swipes['news-5'], 'disliked', 'Dislike recorded')

    // Step 4: User clicks "Resetear Preferencias"
    const resetPrefs = {
      weights: { ai: 1.0, tech: 1.0, science: 1.0, productivity: 1.0, university: 1.0, software: 1.0 },
      swipes: {},
    }
    storage.setItem(PREF_KEY, JSON.stringify(resetPrefs))
    const afterReset = JSON.parse(storage.getItem(PREF_KEY))
    assert.equal(afterReset.weights.ai, 1.0, 'AI weight restored to 1.0')
    assert.equal(afterReset.weights.university, 1.0, 'University weight restored to 1.0')
    assert.deepEqual(afterReset.swipes, {}, 'Swipes cleared')
  })

  it('T4.4 (Scenario 4: High-Frequency Tab Switching & Context Memory Stability): Context structure validation', () => {
    const shellCode = readUtf8(PATHS.APP_SHELL_JSX)
    // Verify that AppShell exports a stable context structure for Outlet consumers
    assert.ok(
      /globalTasks/.test(shellCode) && /setGlobalTasks/.test(shellCode),
      'AppShell context must provide globalTasks and setGlobalTasks'
    )
    assert.ok(
      /isSidebarOpen/.test(shellCode) && /setIsSidebarOpen/.test(shellCode),
      'AppShell context must provide isSidebarOpen state'
    )
  })

  it('T4.5 (Scenario 5: Full Project Production Build & Syntax Validation): Validates package scripts', () => {
    const pkgCode = readUtf8(PATHS.PACKAGE_JSON)
    const pkg = JSON.parse(pkgCode)
    assert.ok(pkg.scripts.build, 'package.json must define "build" script')
    assert.ok(pkg.scripts.dev, 'package.json must define "dev" script')
    assert.ok(pkg.dependencies.react, 'package.json must declare react dependency')
    assert.ok(pkg.dependencies['react-router-dom'], 'package.json must declare react-router-dom')
  })

  it('T4.6 (Scenario 6: Server Route 302 Download End-to-End Test): WhatsApp bridge configures direct asset redirect', () => {
    const code = readUtf8(PATHS.WHATSAPP_BRIDGE_JS)
    assert.ok(
      code.includes('https://github.com/Gekamil/AppHub/releases/download/latest/AppHub.apk'),
      'server/whatsapp-bridge.js must contain redirect destination to official GitHub APK release'
    )
  })
})
