import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '../..')

// Source file paths
const PATH_LANDING_JSX = path.join(PROJECT_ROOT, 'src/pages/LandingPage.jsx')
const PATH_LANDING_CSS = path.join(PROJECT_ROOT, 'src/pages/LandingPage.css')
const PATH_INDEX_HTML = path.join(PROJECT_ROOT, 'index.html')
const PATH_CAPACITOR_CONFIG = path.join(PROJECT_ROOT, 'capacitor.config.json')
const PATH_LOGO_PNG = path.join(PROJECT_ROOT, 'public/logo.png')
const PATH_EXE_DOWNLOAD = path.join(PROJECT_ROOT, 'public/download/StudentHub-Setup.exe')
const PATH_APK_DOWNLOAD = path.join(PROJECT_ROOT, 'public/download/StudentHub.apk')
const PATH_IPA_DOWNLOAD = path.join(PROJECT_ROOT, 'public/download/StudentHub.ipa')
const PATH_DIST_INDEX = path.join(PROJECT_ROOT, 'dist/index.html')
const PATH_ANDROID_ASSET_INDEX = path.join(PROJECT_ROOT, 'android/app/src/main/assets/public/index.html')

// Helper utilities for opaque-box code inspection
function readUtf8(filePath) {
  assert.ok(fs.existsSync(filePath), `Required source file does not exist: ${filePath}`)
  return fs.readFileSync(filePath, 'utf8')
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function extractCssRule(css, selector) {
  const clean = stripComments(css)
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]+)\\}`, 'gm')
  const blocks = []
  let match
  while ((match = regex.exec(clean)) !== null) {
    blocks.push(match[1])
  }
  return blocks.join(';\n')
}

// ==============================================================================
// TIER 1: FEATURE COVERAGE (F1 to F10 derived from ORIGINAL_REQUEST.md & PROJECT.md)
// ==============================================================================

describe('Tier 1: Feature Coverage (F1 to F10)', () => {
  const jsx = readUtf8(PATH_LANDING_JSX)
  const css = readUtf8(PATH_LANDING_CSS)

  // ----------------------------------------------------------------------------
  // Feature 1: Fondo Cinematográfico y Halos de Luz (R1)
  // ----------------------------------------------------------------------------
  describe('F1: Fondo Cinematográfico y Halos de Luz (R1)', () => {
    it('F1.1: Multi-plane atmospheric light orbs (at least 3 light orbs in JSX)', () => {
      // Must contain hero glow plus middle and bottom ambient orbs for continuous background depth
      const hasHeroGlow = /className=["'][^"']*apple-hero-glow[^"']*["']/.test(jsx) || /apple-orb/i.test(jsx)
      assert.ok(hasHeroGlow, 'Hero ambient light orb must be present in LandingPage.jsx')

      // Count ambient light orbs across page sections (hero, showcase/middle, bento, downloads)
      const orbMatches = jsx.match(/apple-(?:hero-glow|orb|glow-orb|ambient-orb)[a-zA-Z0-9_-]*/g) || []
      const orbClassCount = new Set(orbMatches).size
      assert.ok(
        orbClassCount >= 3 || (orbMatches.length >= 3),
        `Expected at least 3 atmospheric ambient light orbs for continuous depth, found ${orbMatches.length} (${[...new Set(orbMatches)].join(', ')})`
      )
    })

    it('F1.2: Atmospheric radial gradient definitions with subtle Apple color palette', () => {
      // Atmospheric ambient halos require radial-gradient with subtle blue/indigo/violet/cyan hues
      const hasRadialGradient = /radial-gradient\([^)]*(?:rgba\(\s*(?:0,\s*113,\s*227|41,\s*151,\s*255|99,\s*102,\s*241|120,\s*119,\s*198|56,\s*189,\s*248|139,\s*92,\s*246|16,\s*185,\s*129))/i.test(css)
      assert.ok(hasRadialGradient, 'CSS must define radial-gradient atmospheric halos with subtle blue/indigo/violet/cyan palette')
    })

    it('F1.3: Background light orbs configured with pointer-events: none and background z-index', () => {
      const cleanCss = stripComments(css)
      const hasPointerEventsNone = /pointer-events\s*:\s*none/i.test(cleanCss) || /pointer-events-none/.test(jsx)
      assert.ok(
        hasPointerEventsNone,
        'Ambient light orbs must have pointer-events: none to avoid blocking user interaction'
      )
      const hasBackgroundZIndex = /z-index\s*:\s*(?:0|-1)/i.test(cleanCss) || /z-(?:0|\[0\]|-1)/.test(jsx)
      assert.ok(
        hasBackgroundZIndex,
        'Ambient light orbs must reside in background plane (z-index: 0 or -1)'
      )
    })

    it('F1.4: High blur radius (>= 60px) on ambient atmospheric halos', () => {
      const blurMatches = css.match(/filter\s*:\s*blur\((\d+)px\)/g) || []
      const largeBlurs = blurMatches.filter((b) => {
        const val = parseInt(b.match(/\d+/)[0], 10)
        return val >= 60
      })
      assert.ok(
        largeBlurs.length >= 1,
        `Ambient orbs must have atmospheric high blur (>= 60px) for smooth lighting, found: ${blurMatches.join(', ')}`
      )
    })

    it('F1.5: Pure dark background and dark color scheme configured', () => {
      assert.ok(
        /color-scheme\s*:\s*dark\s*!important/i.test(css),
        'Landing page CSS must enforce color-scheme: dark !important'
      )
      assert.ok(
        /background-color\s*:\s*#000000/i.test(css) || /bg-black/.test(jsx),
        'Landing page must be anchored on pure black (#000000) canvas'
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Feature 2: Acabado Glassify Translúcido (Frosted Glass) (R1)
  // ----------------------------------------------------------------------------
  describe('F2: Acabado Glassify Translúcido de Alta Fidelidad (R1)', () => {
    it('F2.1: .apple-card specifies hardware-accelerated frosted glass backdrop-filter (24px-40px)', () => {
      const cardRule = extractCssRule(css, '.apple-card')
      assert.ok(cardRule, '.apple-card CSS class rule must be defined')
      
      const hasBackdropFilter = /backdrop-filter\s*:\s*blur\((2[4-9]|3[0-9]|40)px\)/i.test(cardRule)
      assert.ok(
        hasBackdropFilter,
        `.apple-card must define backdrop-filter with blur between 24px and 40px (R1 specification: blur(24px-40px)), got: ${cardRule}`
      )

      const hasSaturate = /saturate\(\s*(?:1[5-9][0-9]|200)%\s*\)/i.test(cardRule)
      assert.ok(hasSaturate, '.apple-card backdrop-filter should include saturation boost (e.g. saturate(180%))')
    })

    it('F2.2: .apple-card defines -webkit-backdrop-filter vendor prefix', () => {
      const cardRule = extractCssRule(css, '.apple-card')
      const hasWebkit = /-webkit-backdrop-filter\s*:\s*blur/i.test(cardRule)
      assert.ok(hasWebkit, '.apple-card must include -webkit-backdrop-filter for Safari / iOS compatibility')
    })

    it('F2.3: .apple-card uses translucent dark background tint allowing light transmission', () => {
      const cardRule = extractCssRule(css, '.apple-card')
      const isOpaqueSolid = /background\s*:\s*#161617\s*!important/i.test(cardRule) && !/rgba/i.test(cardRule)
      assert.equal(
        isOpaqueSolid,
        false,
        '.apple-card must NOT use opaque solid #161617 background; it must be translucent to allow background halos to shine through'
      )

      const hasTranslucentRgba = /background(?:-color)?\s*:\s*rgba\(\s*22,\s*22,\s*26,\s*0\.\d+\)/i.test(cardRule) ||
                                 /background(?:-color)?\s*:\s*rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\.(?:[5-8]\d*)\)/i.test(cardRule)
      assert.ok(hasTranslucentRgba, '.apple-card must use translucent background tint (e.g. rgba(22, 22, 26, 0.68))')
    })

    it('F2.4: .apple-card implements specular top highlight reflection border (1px border-top)', () => {
      const cardRule = extractCssRule(css, '.apple-card')
      const hasBorderTop = /border-top\s*:\s*1px\s+solid\s+rgba\(\s*255,\s*255,\s*255,\s*0\.(?:1[5-9]|2\d|30)\)/i.test(cardRule)
      assert.ok(
        hasBorderTop,
        '.apple-card must specify 1px specular top highlight border reflection (border-top: 1px solid rgba(255, 255, 255, 0.20))'
      )
    })

    it('F2.5: .apple-card features multilayer depth shadow with inset rim highlight', () => {
      const cardRule = extractCssRule(css, '.apple-card')
      const hasInsetShadow = /box-shadow\s*:[^;]*inset\s+0\s+1px\s+0\s+(?:0|1px)\s+rgba\(\s*255,\s*255,\s*255,\s*0\.\d+\)/i.test(cardRule)
      assert.ok(
        hasInsetShadow,
        '.apple-card must include inset 0 1px 0 0 rgba(255, 255, 255, 0.14) specular highlight inside box-shadow'
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Feature 3: Revelado Escalonado al Hacer Scroll (Reveal) (R2)
  // ----------------------------------------------------------------------------
  describe('F3: Revelado Escalonado al Scroll (Reveal) (R2)', () => {
    it('F3.1: Initial unrevealed .reveal-elem defines opacity 0, translateY, scale(0.97), and blur(8px)', () => {
      const elemRule = extractCssRule(css, '.reveal-elem')
      assert.ok(elemRule, '.reveal-elem rule must exist in LandingPage.css')

      assert.ok(/opacity\s*:\s*0/i.test(elemRule), '.reveal-elem initial opacity must be 0')
      assert.ok(/transform\s*:[^;]*translateY\(\s*(?:24|28)px\s*\)/i.test(elemRule), '.reveal-elem must start with translateY offset')
      assert.ok(/transform\s*:[^;]*scale\(\s*0\.9[5-8]\s*\)/i.test(elemRule), '.reveal-elem must start with subtle scale (e.g. scale(0.97))')
      assert.ok(/filter\s*:[^;]*blur\(\s*8px\s*\)/i.test(elemRule), '.reveal-elem must start with blur-to-focus blur(8px)')
    })

    it('F3.2: Active .reveal-elem.revealed transitions to opacity 1, translateY(0), scale(1), and blur(0px)', () => {
      const revealedRule = extractCssRule(css, '.reveal-elem.revealed')
      assert.ok(revealedRule, '.reveal-elem.revealed rule must exist in LandingPage.css')

      assert.ok(/opacity\s*:\s*1/i.test(revealedRule), '.reveal-elem.revealed must transition opacity to 1')
      assert.ok(/transform\s*:[^;]*translateY\(\s*0(?:px)?\s*\)/i.test(revealedRule), '.reveal-elem.revealed must transition translateY to 0')
      assert.ok(/transform\s*:[^;]*scale\(\s*1(?:\.0+)?\s*\)/i.test(revealedRule), '.reveal-elem.revealed must transition scale to 1')
      assert.ok(/filter\s*:[^;]*blur\(\s*0(?:px)?\s*\)/i.test(revealedRule), '.reveal-elem.revealed must transition filter blur to 0px')
    })

    it('F3.3: Smooth Apple-style cubic-bezier(0.16, 1, 0.3, 1) transition timing function', () => {
      const elemRule = extractCssRule(css, '.reveal-elem')
      assert.ok(
        /cubic-bezier\(\s*0\.16,\s*1(?:(?:\.0+)?),\s*0\.3,\s*1(?:\.0+)?\s*\)/i.test(elemRule),
        '.reveal-elem must use Apple smooth cubic-bezier(0.16, 1, 0.3, 1) timing function'
      )
    })

    it('F3.4: Stagger delay classes (.stagger-1 through .stagger-4) provide progressive cascades', () => {
      const s1 = extractCssRule(css, '.stagger-1')
      const s2 = extractCssRule(css, '.stagger-2')
      const s3 = extractCssRule(css, '.stagger-3')
      const s4 = extractCssRule(css, '.stagger-4')

      assert.ok(s1 && /transition-delay/i.test(s1), '.stagger-1 must specify transition-delay')
      assert.ok(s2 && /transition-delay/i.test(s2), '.stagger-2 must specify transition-delay')
      assert.ok(s3 && /transition-delay/i.test(s3), '.stagger-3 must specify transition-delay')
      assert.ok(s4 && /transition-delay/i.test(s4), '.stagger-4 must specify transition-delay')

      // Verify stagger classes are used in LandingPage.jsx on cards or headers
      assert.ok(
        /stagger-1/.test(jsx) && /stagger-2/.test(jsx),
        'LandingPage.jsx elements must use stagger delay classes (.stagger-1, .stagger-2, etc.)'
      )
    })

    it('F3.5: IntersectionObserver observes .reveal-elem and unobserves upon entry', () => {
      assert.ok(
        /IntersectionObserver/i.test(jsx),
        'LandingPage.jsx must instantiate IntersectionObserver'
      )
      assert.ok(
        /classList\.add\(['"]revealed['"]\)/.test(jsx),
        'IntersectionObserver callback must add "revealed" class on intersection'
      )
      assert.ok(
        /(?:obs|observer)\.unobserve/.test(jsx),
        'IntersectionObserver must unobserve element after revealing to free resources'
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Feature 4: Parallax 3D Sutil en Orbes de Fondo (R2)
  // ----------------------------------------------------------------------------
  describe('F4: Parallax 3D Sutil en Orbes de Fondo (R2)', () => {
    it('F4.1: Scroll tracking loop utilizes requestAnimationFrame for 60+ FPS execution', () => {
      assert.ok(
        /requestAnimationFrame/i.test(jsx),
        'LandingPage.jsx must implement requestAnimationFrame for smooth 60+ FPS scroll tracking'
      )
    })

    it('F4.2: Window scroll listener registered with passive: true option', () => {
      assert.ok(
        /addEventListener\(\s*['"]scroll['"][^)]*\{[^}]*passive\s*:\s*true/i.test(jsx),
        'Scroll event listener must specify { passive: true } for non-blocking scrolling'
      )
    })

    it('F4.3: Lifecycle cleanup removes scroll listener or cancels animation frame on unmount', () => {
      const hasListenerCleanup = /removeEventListener\(\s*['"]scroll['"]/i.test(jsx)
      const hasRafCleanup = /cancelAnimationFrame/i.test(jsx)
      assert.ok(
        hasListenerCleanup || hasRafCleanup,
        'LandingPage.jsx must clean up scroll listeners or animation frame on unmount to prevent memory leaks'
      )
    })

    it('F4.4: Direct DOM ref mutation applied to light orbs avoiding React state re-renders', () => {
      // Must use useRef for light orbs rather than useState on every scroll event
      assert.ok(
        /useRef/i.test(jsx),
        'LandingPage.jsx must use React useRef for direct DOM node references'
      )
      assert.ok(
        /\.style\.transform\s*=|\.current\.style/i.test(jsx),
        'Parallax effect must update style.transform directly on DOM ref for zero re-render overhead'
      )
    })

    it('F4.5: Multiple parallax coefficients implemented for depth differentiation', () => {
      // At least 2 different multipliers or decoupled transform calculations
      const hasMultipliers = /(?:[*-]\s*0\.0[2-9]|[*-]\s*0\.[1-5])/i.test(jsx) ||
                             /(?:scroll(?:Y|Top)|window\.scrollY)\s*\*/i.test(jsx)
      assert.ok(
        hasMultipliers,
        'Parallax calculation must compute subtle vertical/horizontal offsets based on scroll position'
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Feature 5: Transición Fluida entre Pestañas de Espacio de Trabajo (R2)
  // ----------------------------------------------------------------------------
  describe('F5: Transición Fluida entre Pestañas de Espacio de Trabajo (R2)', () => {
    it('F5.1: Workspace features 3 interactive view switchers (semanal, mensual, radar)', () => {
      assert.ok(/setActiveTab\(['"]semanal['"]\)/.test(jsx), 'Must provide switch to semanal view')
      assert.ok(/setActiveTab\(['"]mensual['"]\)/.test(jsx), 'Must provide switch to mensual view')
      assert.ok(/setActiveTab\(['"]radar['"]\)/.test(jsx), 'Must provide switch to radar view')
    })

    it('F5.2: CSS defines smooth tab transition animation (@keyframes tabPaneEnter or .tab-pane-animate)', () => {
      const hasTabKeyframes = /@keyframes\s+tabPaneEnter/i.test(css) || /\.tab-pane-animate/i.test(css)
      assert.ok(
        hasTabKeyframes,
        'CSS must define entrance transition (@keyframes tabPaneEnter or .tab-pane-animate) for tab switches'
      )
    })

    it('F5.3: Demonstration container enforces calibrated min-height (>= 460px) guaranteeing zero CLS', () => {
      const hasMinHeight = /min-h-\[(?:4[6-9][0-9]|[5-9][0-9]{2})px\]/.test(jsx) ||
                           /min-height\s*:\s*(?:4[6-9][0-9]|[5-9][0-9]{2})px/i.test(css)
      assert.ok(
        hasMinHeight,
        'Workspace frame container must specify calibrated min-height (>= 460px) to prevent Cumulative Layout Shift'
      )
    })

    it('F5.4: Active tab button applies prominent styling contrast vs inactive tabs', () => {
      assert.ok(
        /activeTab\s*===\s*['"]semanal['"]\s*\?[^:]+:[^;]+/i.test(jsx) ||
        /bg-\[#0071e3\]|bg-white\/10/.test(jsx),
        'Tab buttons must visually reflect active state with high-contrast styling'
      )
    })

    it('F5.5: Workspace contains live clock, interactive calendar, and exam radar progress meters', () => {
      assert.ok(/currentTimeStr/.test(jsx), 'Workspace must display live precision clock')
      assert.ok(/examen|lab|entrega/i.test(jsx), 'Monthly view must highlight academic calendar events')
      assert.ok(/85%|45%/i.test(jsx), 'Radar view must display progress indicators')
    })
  })

  // ----------------------------------------------------------------------------
  // Feature 6: Micro-interacciones y Destello en Botones (Apple Sheen) (R2)
  // ----------------------------------------------------------------------------
  describe('F6: Micro-interacciones y Destello en Botones (Apple Sheen) (R2)', () => {
    it('F6.1: Specular button sheen sweep effect (.apple-btn-sheen or @keyframes sheen) defined in CSS', () => {
      const hasSheen = /\.apple-btn-sheen/i.test(css) || /@keyframes\s+(?:sheen|btnSheen|buttonShine)/i.test(css)
      assert.ok(
        hasSheen,
        'CSS must define Apple specular button sheen sweep (.apple-btn-sheen or @keyframes sheen)'
      )
    })

    it('F6.2: Tactile press feedback (active:scale(0.98)) configured on primary and secondary buttons', () => {
      const blueRule = extractCssRule(css, '.apple-btn-blue:active')
      const secRule = extractCssRule(css, '.apple-btn-secondary:active')
      assert.ok(
        /scale\(\s*0\.9[7-9]\s*\)/i.test(blueRule),
        '.apple-btn-blue:active must define tactile scale compression (e.g. scale(0.98))'
      )
      assert.ok(
        /scale\(\s*0\.9[7-9]\s*\)/i.test(secRule),
        '.apple-btn-secondary:active must define tactile scale compression (e.g. scale(0.98))'
      )
    })

    it('F6.3: Hover elevation and scale micro-interaction configured on buttons', () => {
      const blueHover = extractCssRule(css, '.apple-btn-blue:hover')
      assert.ok(
        /scale\(\s*1\.0[1-3]\s*\)/i.test(blueHover) || /translateY\(-1px\)/i.test(blueHover),
        '.apple-btn-blue:hover must provide subtle hover micro-interaction'
      )
    })

    it('F6.4: Smooth cubic-bezier(0.16, 1, 0.3, 1) transition easing applied to button micro-interactions', () => {
      const blueBase = extractCssRule(css, '.apple-btn-blue')
      assert.ok(
        /cubic-bezier\(\s*0\.16,\s*1(?:(?:\.0+)?),\s*0\.3,\s*1(?:\.0+)?\s*\)/i.test(blueBase),
        '.apple-btn-blue must use smooth Apple cubic-bezier(0.16, 1, 0.3, 1) transition timing'
      )
    })

    it('F6.5: Translucent frosted glass treatment on secondary button (.apple-btn-secondary)', () => {
      const secBase = extractCssRule(css, '.apple-btn-secondary')
      assert.ok(
        /backdrop-filter\s*:\s*blur\(/i.test(secBase),
        '.apple-btn-secondary must use frosted glass backdrop-filter: blur(...)'
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Feature 7: Integración Nítida del Logo Oficial (R3)
  // ----------------------------------------------------------------------------
  describe('F7: Integración Nítida del Logo Oficial (R3)', () => {
    it('F7.1: Official logo (/logo.png) referenced in fixed floating header navbar', () => {
      assert.ok(
        /<header[\s\S]*?<img[^>]*src=["']\/logo\.png["']/i.test(jsx),
        'Header navbar must display official logo (/logo.png)'
      )
    })

    it('F7.2: Official logo (/logo.png) referenced in footer', () => {
      assert.ok(
        /<footer[\s\S]*?<img[^>]*src=["']\/logo\.png["']/i.test(jsx),
        'Footer must display official logo (/logo.png)'
      )
    })

    it('F7.3: High-clarity rendering without destructive filter invert or muddy opacity', () => {
      // Invert filter on the white squircle logo turns it into an inverted black box.
      // Must NOT have "filter invert" in either header or footer.
      const hasHeaderInvert = /<header[\s\S]*?filter\s+invert[\s\S]*?<\/header>/i.test(jsx)
      const hasFooterInvert = /<footer[\s\S]*?filter\s+invert[\s\S]*?<\/footer>/i.test(jsx)
      assert.equal(
        hasHeaderInvert,
        false,
        'Header logo must not apply "filter invert" which degrades brand logo fidelity'
      )
      assert.equal(
        hasFooterInvert,
        false,
        'Footer logo must not apply "filter invert" which degrades brand logo fidelity'
      )
    })

    it('F7.4: Logo contains descriptive semantic alt attribute in header and footer', () => {
      const headerImg = jsx.match(/<header[\s\S]*?<img[^>]*src=["']\/logo\.png["'][^>]*>/i)?.[0] || ''
      const footerImg = jsx.match(/<footer[\s\S]*?<img[^>]*src=["']\/logo\.png["'][^>]*>/i)?.[0] || ''
      assert.ok(/alt=["'][^"']*StudentHub[^"']*["']/i.test(headerImg), 'Header logo must have semantic alt attribute')
      assert.ok(/alt=["'][^"']*StudentHub[^"']*["']/i.test(footerImg), 'Footer logo must have semantic alt attribute')
    })

    it('F7.5: Official logo file public/logo.png exists with valid PNG signature', () => {
      assert.ok(fs.existsSync(PATH_LOGO_PNG), 'public/logo.png must physically exist')
      const buffer = fs.readFileSync(PATH_LOGO_PNG)
      assert.ok(buffer.length > 1000, `public/logo.png must be non-empty image (size=${buffer.length})`)
      const pngHeader = buffer.subarray(0, 8)
      const expectedHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      assert.ok(pngHeader.equals(expectedHeader), 'public/logo.png must have valid PNG magic header bytes')
    })
  })

  // ----------------------------------------------------------------------------
  // Feature 8: Tipografía y Armonía Visual Estilo Apple (R3)
  // ----------------------------------------------------------------------------
  describe('F8: Tipografía y Armonía Visual Estilo Apple (R3)', () => {
    it('F8.1: Primary typography uses high-contrast crisp white (#ffffff or #f5f5f7)', () => {
      assert.ok(
        /text-\[#(?:ffffff|f5f5f7)\]|text-white/.test(jsx),
        'Primary headlines and copy must use crisp high-contrast white'
      )
    })

    it('F8.2: Muted secondary text uses standard Apple grey #86868b', () => {
      assert.ok(
        /text-\[#86868b\]/.test(jsx),
        'Secondary labels, descriptions, and metadata must use Apple secondary grey #86868b'
      )
    })

    it('F8.3: Apple typography font stack prioritizing SF Pro / system font stack', () => {
      assert.ok(
        /font-family\s*:[^;]*-apple-system/i.test(css) &&
        /font-family\s*:[^;]*BlinkMacSystemFont/i.test(css) &&
        /font-family\s*:[^;]*SF Pro/i.test(css),
        'Landing page must specify Apple system font stack (-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text")'
      )
    })

    it('F8.4: Negative letter-spacing tracking applied for Apple-style optical density', () => {
      assert.ok(
        /letter-spacing\s*:\s*-0\.015em/i.test(css) || /tracking-tight/.test(jsx),
        'Typography must incorporate Apple negative letter spacing for crisp headline density'
      )
    })

    it('F8.5: Body text free of harsh artificial rainbow gradients', () => {
      // Subtitle and body text should be clean text-[#86868b], not bg-gradient-to-r text-transparent
      const heroSubtitle = jsx.match(/El primer centro de mando académico[\s\S]*?<\/p>/i)?.[0] || ''
      assert.equal(
        /bg-gradient-to-r.*text-transparent/.test(heroSubtitle),
        false,
        'Hero subtitle must not use artificial rainbow gradient text'
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Feature 9: Marco de Demostración y Tarjetas de Descarga (R3)
  // ----------------------------------------------------------------------------
  describe('F9: Marco de Demostración y Tarjetas de Descarga (R3)', () => {
    it('F9.1: MacBook hardware device frame (.apple-device-frame) with macOS traffic light controls', () => {
      assert.ok(
        /apple-device-frame/.test(jsx),
        'Demonstration container must adopt .apple-device-frame class'
      )
      assert.ok(
        /bg-\[#ff5f56\]/.test(jsx) && /bg-\[#ffbd2e\]/.test(jsx) && /bg-\[#27c93f\]/.test(jsx),
        'Demonstration window frame must include macOS window control dots (#ff5f56, #ffbd2e, #27c93f)'
      )
    })

    it('F9.2: Windows download card with direct link to /download/StudentHub-Setup.exe', () => {
      assert.ok(
        /href=["']\/download\/StudentHub-Setup\.exe["']/.test(jsx),
        'Windows download card must provide direct download link to /download/StudentHub-Setup.exe'
      )
    })

    it('F9.3: Android download card with direct link to /download/StudentHub.apk', () => {
      assert.ok(
        /href=["']\/download\/StudentHub\.apk["']/.test(jsx),
        'Android download card must provide direct download link to /download/StudentHub.apk'
      )
    })

    it('F9.4: iOS & Web PWA download card with Safari installation modal trigger', () => {
      assert.ok(
        /setIsIosModalOpen\(true\)/.test(jsx),
        'iOS download card must trigger modal dialog explaining Safari installation'
      )
      assert.ok(
        /Añadir a pantalla de inicio/i.test(jsx),
        'iOS modal dialog must display Apple Safari "Añadir a pantalla de inicio" instructions'
      )
    })

    it('F9.5: Platform download cards adopt unified .apple-card frosted glass styling', () => {
      const downloadSection = jsx.match(/<section[^>]*id=["']descargas["'][\s\S]*?<\/section>/i)?.[0] || ''
      assert.ok(
        downloadSection.includes('apple-card'),
        'Download section cards must use .apple-card glass styling'
      )
    })
  })

  // ----------------------------------------------------------------------------
  // Feature 10: Verificación de Compilación y Capacitor Sync (AC)
  // ----------------------------------------------------------------------------
  describe('F10: Verificación de Compilación y Capacitor Sync (AC)', () => {
    it('F10.1: Build command npm.cmd run build exits with code 0 and 0 errors', () => {
      // Execute production build
      let stdout = ''
      try {
        stdout = execSync('npm.cmd run build', {
          cwd: PROJECT_ROOT,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 60000,
        })
      } catch (err) {
        assert.fail(`npm.cmd run build failed: ${err.message}\n${err.stdout}\n${err.stderr}`)
      }
      assert.ok(/built in/i.test(stdout), `Build stdout should confirm successful bundle generation: ${stdout}`)
    })

    it('F10.2: Built output dist/index.html exists and contains valid HTML structure', () => {
      assert.ok(fs.existsSync(PATH_DIST_INDEX), 'dist/index.html must exist after production build')
      const distHtml = fs.readFileSync(PATH_DIST_INDEX, 'utf8')
      assert.ok(/<div id=["']root["']>/.test(distHtml), 'dist/index.html must contain root mount element')
      assert.ok(/<script\s+type=["']module["']/i.test(distHtml), 'dist/index.html must load module bundles')
    })

    it('F10.3: Capacitor configuration specifies valid appId and webDir: dist', () => {
      assert.ok(fs.existsSync(PATH_CAPACITOR_CONFIG), 'capacitor.config.json must exist')
      const config = JSON.parse(fs.readFileSync(PATH_CAPACITOR_CONFIG, 'utf8'))
      assert.equal(config.webDir, 'dist', 'Capacitor webDir must point to "dist"')
      assert.ok(config.appId, 'Capacitor config must define appId')
    })

    it('F10.4: Capacitor Android sync npx.cmd cap sync android exits with code 0', () => {
      let stdout = ''
      try {
        stdout = execSync('npx.cmd cap sync android', {
          cwd: PROJECT_ROOT,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 60000,
        })
      } catch (err) {
        assert.fail(`npx.cmd cap sync android failed: ${err.message}\n${err.stdout}\n${err.stderr}`)
      }
      assert.ok(/Sync finished|copy android/i.test(stdout), `Capacitor sync stdout should confirm completion: ${stdout}`)
    })

    it('F10.5: Android synced web assets are updated in android/app/src/main/assets/public/index.html', () => {
      assert.ok(
        fs.existsSync(PATH_ANDROID_ASSET_INDEX),
        'Capacitor sync must mirror web assets to android/app/src/main/assets/public/index.html'
      )
    })
  })
})

// ==============================================================================
// TIER 2: BOUNDARY & CORNER CASES
// ==============================================================================

describe('Tier 2: Boundary & Corner Cases', () => {
  const jsx = readUtf8(PATH_LANDING_JSX)
  const css = readUtf8(PATH_LANDING_CSS)
  const indexHtml = readUtf8(PATH_INDEX_HTML)

  it('T2.1: Accessibility prefers-reduced-motion media query neutralizes animations and blurs', () => {
    assert.ok(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i.test(css),
      'CSS must include @media (prefers-reduced-motion: reduce) to support users with motion sensitivity'
    )
    const reducedMotionBlock = css.match(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/i)?.[1] || ''
    assert.ok(
      /transition\s*:\s*none|animation\s*:\s*none|transform\s*:\s*none/i.test(reducedMotionBlock),
      'Reduced motion block must suppress motion or transitions'
    )
  })

  it('T2.2: Zero CLS boundary: Workspace demo frame container specifies minimum height constraint', () => {
    const minHeightClass = jsx.match(/min-h-\[([0-9]+)px\]/)?.[1]
    assert.ok(minHeightClass, 'Workspace container must specify an explicit min-height class to prevent layout shifts')
    const minHeightVal = parseInt(minHeightClass, 10)
    assert.ok(minHeightVal >= 400, `min-height must be at least 400px (calibrated value: 460px), got ${minHeightVal}px`)
  })

  it('T2.3: Glassify border boundary: Border width is strictly 1px and alpha channel < 1.0', () => {
    const cardRule = extractCssRule(css, '.apple-card')
    const borderMatch = cardRule.match(/border(?:-top)?\s*:\s*(\d+)px\s+solid\s+rgba\(\s*255,\s*255,\s*255,\s*(0\.\d+)\)/i)
    assert.ok(borderMatch, '.apple-card must use 1px translucent white border')
    assert.equal(borderMatch[1], '1', 'Border width must be exactly 1px for Apple razor-sharp borders')
    const alpha = parseFloat(borderMatch[2])
    assert.ok(alpha > 0 && alpha < 1, `Border alpha must be translucent (< 1.0), got ${alpha}`)
  })

  it('T2.4: Frosted blur boundary: Backdrop-filter blur radius falls within Apple bounds of 24px-40px', () => {
    const cardRule = extractCssRule(css, '.apple-card')
    const blurMatch = cardRule.match(/backdrop-filter\s*:[^;]*blur\((\d+)px\)/i)
    assert.ok(blurMatch, '.apple-card must define backdrop-filter blur radius')
    const blurVal = parseInt(blurMatch[1], 10)
    assert.ok(
      blurVal >= 24 && blurVal <= 40,
      `Backdrop blur must be between 24px and 40px (R1 specification: blur(24px-40px)), got ${blurVal}px`
    )
  })

  it('T2.5: Mobile viewport meta tag correctly defined in index.html', () => {
    assert.ok(
      /<meta\s+name=["']viewport["']\s+content=["'][^"']*width=device-width[^"']*initial-scale=1\.0[^"']*["']/i.test(indexHtml),
      'index.html must specify standard mobile responsive viewport meta tag'
    )
  })

  it('T2.6: Horizontal overflow boundary: .landing-root enforces overflow-x: hidden', () => {
    assert.ok(
      /overflow-x-hidden/.test(jsx) || /overflow-x\s*:\s*hidden/i.test(css),
      'Landing root container must enforce overflow-x: hidden to prevent unwanted horizontal scrollbar leaks'
    )
  })

  it('T2.7: Font stack fallback boundary: Ends in generic sans-serif for universal rendering', () => {
    const fontStackMatch = css.match(/font-family\s*:\s*([^;]+);/i)
    assert.ok(fontStackMatch, 'CSS must declare font-family stack')
    assert.ok(
      /sans-serif\s*$/i.test(fontStackMatch[1].trim()),
      `Font stack must end with generic sans-serif fallback, got: ${fontStackMatch[1]}`
    )
  })
})

// ==============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS
// ==============================================================================

describe('Tier 3: Cross-Feature Combinations', () => {
  const jsx = readUtf8(PATH_LANDING_JSX)
  const css = readUtf8(PATH_LANDING_CSS)

  it('T3.1: Glass cards (.apple-card) + Background light orbs: Stacking order allows backdrop refraction', () => {
    // Ambient orbs must have z-index 0 or negative, while main content/cards sit above them
    const orbRule = extractCssRule(css, '.apple-orb') + extractCssRule(css, '.apple-orb-hero')
    const hasOrbLayering = /pointer-events\s*:\s*none/i.test(orbRule) ||
                          /z-(?:0|-1|\[0\])/.test(jsx) ||
                          /z-index\s*:\s*(?:0|-1)/i.test(orbRule)
    assert.ok(
      hasOrbLayering,
      'Light orbs must be background-layered so foreground glass cards can refract the ambient glow'
    )
  })

  it('T3.2: IntersectionObserver reveal + Stagger delays: Monotonically increasing transition delays', () => {
    const s1Rule = extractCssRule(css, '.stagger-1')
    const s2Rule = extractCssRule(css, '.stagger-2')
    const s3Rule = extractCssRule(css, '.stagger-3')
    const s4Rule = extractCssRule(css, '.stagger-4')

    function parseDelayMs(rule) {
      const match = rule.match(/transition-delay\s*:\s*([0-9.]+)(m?s)/i)
      if (!match) return 0
      const val = parseFloat(match[1])
      return match[2].toLowerCase() === 's' ? val * 1000 : val
    }

    const d1 = parseDelayMs(s1Rule)
    const d2 = parseDelayMs(s2Rule)
    const d3 = parseDelayMs(s3Rule)
    const d4 = parseDelayMs(s4Rule)

    assert.ok(d1 < d2, `Stagger delay 1 (${d1}ms) must be less than delay 2 (${d2}ms)`)
    assert.ok(d2 < d3, `Stagger delay 2 (${d2}ms) must be less than delay 3 (${d3}ms)`)
    assert.ok(d3 < d4, `Stagger delay 3 (${d3}ms) must be less than delay 4 (${d4}ms)`)
  })

  it('T3.3: Tab switching state + Keyframe animation: View switch re-renders tab with smooth entrance', () => {
    // When switching activeTab, the container element mounts tab-pane with animation
    assert.ok(
      /tab-pane-animate|@keyframes\s+tabPaneEnter/i.test(css) ||
      /animate-/i.test(jsx),
      'Switching workspace tabs must trigger hardware-composited keyframe entrance animation'
    )
  })

  it('T3.4: Floating navbar + Glassify + Brand logo: Header navbar combines blur, tint, and crisp brand logo', () => {
    const headerSnippet = jsx.match(/<header[\s\S]*?<\/header>/i)?.[0] || ''
    const navbarRule = extractCssRule(css, '.apple-navbar')
    const hasBackdropBlur = headerSnippet.includes('backdrop-blur') || /backdrop-filter\s*:[^;]*blur/i.test(navbarRule)
    assert.ok(
      hasBackdropBlur,
      'Header navbar must employ backdrop blur'
    )
    assert.ok(
      headerSnippet.includes('/logo.png'),
      'Header navbar must integrate official brand logo'
    )
    assert.ok(
      !headerSnippet.includes('filter invert'),
      'Header navbar must preserve authentic logo pixels without filter inversion'
    )
  })

  it('T3.5: Primary CTA sheen + Active scale: Combines specular sweep with tactile click compression', () => {
    const blueBase = extractCssRule(css, '.apple-btn-blue')
    const blueActive = extractCssRule(css, '.apple-btn-blue:active')
    assert.ok(
      /transition/i.test(blueBase),
      'Primary button must define smooth transitions'
    )
    assert.ok(
      /scale\(\s*0\.98\s*\)/i.test(blueActive),
      'Primary button must compress to scale(0.98) on click'
    )
  })
})

// ==============================================================================
// TIER 4: REAL-WORLD SCENARIOS
// ==============================================================================

describe('Tier 4: Real-World Scenarios', () => {
  it('T4.1: Production build executes successfully (npm.cmd run build -> exit code 0)', () => {
    const output = execSync('npm.cmd run build', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000,
    })
    assert.ok(/built in/i.test(output), 'npm.cmd run build must finish and generate build artifacts')
  })

  it('T4.2: Capacitor Android sync executes successfully (npx.cmd cap sync android -> exit code 0)', () => {
    const output = execSync('npx.cmd cap sync android', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000,
    })
    assert.ok(/Sync finished|copy android/i.test(output), 'npx.cmd cap sync android must finish successfully')
  })

  it('T4.3: Brand asset verification: public/logo.png exists, size > 1000B, valid PNG signature', () => {
    assert.ok(fs.existsSync(PATH_LOGO_PNG), 'public/logo.png must exist')
    const buffer = fs.readFileSync(PATH_LOGO_PNG)
    assert.ok(buffer.length > 1000, `Logo file must be authentic image, size=${buffer.length}`)
    const expected = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    assert.ok(buffer.subarray(0, 8).equals(expected), 'public/logo.png must match PNG signature')
  })

  it('T4.4: Windows binary asset verification: public/download/StudentHub-Setup.exe exists and is non-empty', () => {
    assert.ok(fs.existsSync(PATH_EXE_DOWNLOAD), 'Windows installer binary must exist at public/download/StudentHub-Setup.exe')
    const stat = fs.statSync(PATH_EXE_DOWNLOAD)
    assert.ok(stat.size > 0, `Windows installer binary must have size > 0 (found ${stat.size} bytes)`)
  })

  it('T4.5: Android binary asset verification: public/download/StudentHub.apk exists and is non-empty', () => {
    assert.ok(fs.existsSync(PATH_APK_DOWNLOAD), 'Android package binary must exist at public/download/StudentHub.apk')
    const stat = fs.statSync(PATH_APK_DOWNLOAD)
    assert.ok(stat.size > 0, `Android package binary must have size > 0 (found ${stat.size} bytes)`)
  })

  it('T4.6: iOS binary asset verification: public/download/StudentHub.ipa exists and is non-empty', () => {
    assert.ok(fs.existsSync(PATH_IPA_DOWNLOAD), 'iOS package binary must exist at public/download/StudentHub.ipa')
    const stat = fs.statSync(PATH_IPA_DOWNLOAD)
    assert.ok(stat.size > 0, `iOS package binary must have size > 0 (found ${stat.size} bytes)`)
  })

  it('T4.7: Production bundle contains HTML root and module entry chunks in dist/assets', () => {
    const distIndex = readUtf8(PATH_DIST_INDEX)
    assert.ok(distIndex.includes('<div id="root"></div>'), 'Production HTML must contain <div id="root"></div>')
    const assetsDir = path.join(PROJECT_ROOT, 'dist/assets')
    assert.ok(fs.existsSync(assetsDir), 'dist/assets must exist')
    const files = fs.readdirSync(assetsDir)
    assert.ok(files.some((f) => f.endsWith('.js')), 'dist/assets must contain JavaScript chunks')
    assert.ok(files.some((f) => f.endsWith('.css')), 'dist/assets must contain CSS stylesheet chunks')
  })
})
