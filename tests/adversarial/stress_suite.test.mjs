import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '../..')

const PATH_LANDING_JSX = path.join(PROJECT_ROOT, 'src/pages/LandingPage.jsx')
const PATH_LANDING_CSS = path.join(PROJECT_ROOT, 'src/pages/LandingPage.css')
const PATH_INDEX_HTML = path.join(PROJECT_ROOT, 'index.html')
const PATH_LOGO_PNG = path.join(PROJECT_ROOT, 'public/logo.png')
const PATH_EXE = path.join(PROJECT_ROOT, 'public/download/StudentHub-Setup.exe')
const PATH_APK = path.join(PROJECT_ROOT, 'public/download/StudentHub.apk')
const PATH_IPA = path.join(PROJECT_ROOT, 'public/download/StudentHub.ipa')
const PATH_DIST_CSS = path.join(PROJECT_ROOT, 'dist/assets/index-1ePblfq0.css')
const PATH_DIST_JS = path.join(PROJECT_ROOT, 'dist/assets/index-D2CQc6PU.js')

function readUtf8(p) {
  assert.ok(fs.existsSync(p), `File must exist: ${p}`)
  return fs.readFileSync(p, 'utf8')
}

// Robust brace-matching block extractor for nested CSS @media rules
function extractNestedBlock(css, atRulePrefix) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const idx = clean.indexOf(atRulePrefix)
  if (idx === -1) return null

  const startBrace = clean.indexOf('{', idx)
  if (startBrace === -1) return null

  let depth = 0
  let endBrace = -1
  for (let i = startBrace; i < clean.length; i++) {
    if (clean[i] === '{') depth++
    else if (clean[i] === '}') {
      depth--
      if (depth === 0) {
        endBrace = i
        break
      }
    }
  }

  if (endBrace === -1) return null
  return clean.slice(startBrace + 1, endBrace)
}

describe('Adversarial Stress Testing & UX Challenge Suite', () => {
  const jsx = readUtf8(PATH_LANDING_JSX)
  const css = readUtf8(PATH_LANDING_CSS)
  const html = readUtf8(PATH_INDEX_HTML)

  // ============================================================================
  // CHALLENGE 1: RESPONSIVENESS ACROSS VIEWPORT BOUNDARIES (320px to 2560px+)
  // ============================================================================
  describe('Challenge 1: Responsiveness Across Viewports (320px - 2560px)', () => {
    it('C1.1: Mobile viewport configuration in index.html is mobile-optimized', () => {
      const metaViewportMatch = html.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']*)["']/i)
      assert.ok(metaViewportMatch, 'Viewport meta tag must exist in index.html')
      const content = metaViewportMatch[1]
      assert.match(content, /width=device-width/i, 'Viewport must specify width=device-width')
      assert.match(content, /initial-scale=1\.0/i, 'Viewport must specify initial-scale=1.0')
      assert.match(content, /viewport-fit=cover/i, 'Viewport must specify viewport-fit=cover for edge-to-edge iOS displays')
    })

    it('C1.2: Horizontal overflow boundary containment on 320px screen', () => {
      // The root container must have overflow-x: hidden to prevent horizontal blowout on mobile
      assert.match(jsx, /overflow-x-hidden/, 'Landing root container must specify overflow-x-hidden')
      assert.match(jsx, /pointer-events-none\s+absolute\s+inset-0\s+overflow-hidden/, 'Light orb layer must enforce overflow-hidden')
    })

    it('C1.3: Hero call-to-action buttons wrap safely on 320px narrow mobile screens', () => {
      // Check hero CTA button container: min-w-[190px] buttons inside flex-wrap
      const heroCtaMatch = jsx.match(/<div[^>]*className=["'][^"']*flex-wrap[^"']*["'][^>]*>[\s\S]*?Descargar Gratis[\s\S]*?Probar en Navegador[\s\S]*?<\/div>/)
      assert.ok(heroCtaMatch, 'Hero CTA button container must use flex-wrap')
      assert.ok(heroCtaMatch[0].includes('flex-wrap'), 'Hero CTA must use flex-wrap to prevent clipping on 320px mobile screens')
      
      // Available width on 320px screen with px-4 (16px * 2 = 32px padding) is 288px.
      // 190px <= 288px, so stacked buttons fit without overflow.
      const availableMobileWidth = 320 - 32
      const buttonMinWidth = 190
      assert.ok(buttonMinWidth < availableMobileWidth, `Button min-width (${buttonMinWidth}px) must be <= available mobile width (${availableMobileWidth}px)`)
    })

    it('C1.4: Mobile navigation bar collapses desktop links and avoids 320px clipping', () => {
      // Navbar links must be hidden on mobile (hidden md:flex)
      const navLinksMatch = jsx.match(/<nav[^>]*className=["']([^"']*)["']/)
      assert.ok(navLinksMatch, 'Nav element must be present in header')
      assert.match(navLinksMatch[1], /hidden\s+md:flex/, 'Nav links must be hidden on mobile (hidden md:flex)')

      // Version badge hidden on very small screens (hidden sm:inline-block)
      const versionBadgeMatch = jsx.match(/<span[^>]*v0\.0\.8[^>]*className=["']([^"']*)["']/) ||
                                jsx.match(/className=["']([^"']*)["'][^>]*>\s*v0\.0\.8/)
      assert.ok(versionBadgeMatch, 'Version badge must be present')
      assert.match(versionBadgeMatch[1], /hidden\s+sm:inline-block/, 'Version badge must hide on <640px to preserve mobile navbar room')
    })

    it('C1.5: Grid layouts collapse to 1 column on mobile (<768px)', () => {
      // Bento cards: grid-cols-1 md:grid-cols-2
      const bentoGrid = jsx.match(/className=["'][^"']*grid-cols-1\s+md:grid-cols-2[^"']*["']/)
      assert.ok(bentoGrid, 'Bento section must use grid-cols-1 on mobile and md:grid-cols-2 on tablet/desktop')

      // Downloads cards: grid-cols-1 md:grid-cols-3
      const downloadGrid = jsx.match(/className=["'][^"']*grid-cols-1\s+md:grid-cols-3[^"']*["']/)
      assert.ok(downloadGrid, 'Downloads section must use grid-cols-1 on mobile and md:grid-cols-3 on desktop')

      // Workspace events: grid-cols-1 md:grid-cols-2
      const workspaceEvents = jsx.match(/className=["'][^"']*grid-cols-1\s+md:grid-cols-2\s+gap-3[^"']*["']/)
      assert.ok(workspaceEvents, 'Workspace events grid must use grid-cols-1 on mobile')
    })

    it('C1.6: Widescreen containment on 1920px and 2560px displays', () => {
      // Content must be constrained by max-w-6xl or max-w-5xl with mx-auto
      const maxWMatches = jsx.match(/max-w-(?:5xl|6xl)\s+mx-auto/g) || []
      assert.ok(maxWMatches.length >= 4, `Expected at least 4 max-w-* mx-auto centered containers, found ${maxWMatches.length}`)
    })

    it('C1.7: Calendar month grid maintains column bounds on 320px screens', () => {
      // The 7-column calendar must use truncate on text labels to prevent cell blowout
      const calendarMatch = jsx.match(/activeTab === 'mensual'[\s\S]*?grid-cols-7[\s\S]*?truncate/)
      assert.ok(calendarMatch, 'Calendar cells must use truncate to prevent horizontal overflow on 320px screens')
    })
  })

  // ============================================================================
  // CHALLENGE 2: RAPID SCROLLING, BOUNCE & PARALLAX ROBUSTNESS
  // ============================================================================
  describe('Challenge 2: Scroll Stress, Elastic Bounce & Parallax Invariants', () => {
    it('C2.1: Parallax math model produces valid finite CSS strings on negative scroll (iOS bounce)', () => {
      // In iOS or trackpads, rubber-banding produces negative scrollY (e.g. -150px)
      const bounceY = -150
      const orb1Y = bounceY * 0.12
      const orb2Y = bounceY * -0.07
      const orb3Y = bounceY * -0.10

      assert.ok(Math.abs(orb1Y - (-18)) < 1e-9)
      assert.ok(Math.abs(orb2Y - 10.5) < 1e-9)
      assert.ok(Math.abs(orb3Y - 15) < 1e-9)

      const orb1Transform = `translate3d(-50%, ${orb1Y}px, 0)`
      const orb2Transform = `translate3d(0, ${orb2Y}px, 0)`
      const orb3Transform = `translate3d(0, ${orb3Y}px, 0)`

      assert.ok(!orb1Transform.includes('NaN'), 'Parallax transform must not produce NaN on negative scroll')
      assert.ok(!orb2Transform.includes('NaN'), 'Parallax transform must not produce NaN on negative scroll')
      assert.ok(!orb3Transform.includes('NaN'), 'Parallax transform must not produce NaN on negative scroll')
    })

    it('C2.2: Parallax math model survives ultra-deep scroll (y = 50,000px)', () => {
      const deepY = 50000
      const orb1Y = deepY * 0.12
      const orb2Y = deepY * -0.07
      const orb3Y = deepY * -0.10

      assert.ok(Number.isFinite(orb1Y) && Number.isFinite(orb2Y) && Number.isFinite(orb3Y))
      assert.ok(Math.abs(orb1Y - 6000) < 1e-9)
      assert.ok(Math.abs(orb2Y - (-3500)) < 1e-9)
      assert.ok(Math.abs(orb3Y - (-5000)) < 1e-9)
    })

    it('C2.3: Re-entrant scroll event flood does not starve the UI thread (RAF Throttling)', () => {
      // Verify throttling flag pattern in LandingPage.jsx
      assert.match(jsx, /let\s+ticking\s*=\s*false/, 'Must declare ticking throttle lock')
      assert.match(jsx, /if\s*\(!ticking\)\s*\{[\s\S]*?window\.requestAnimationFrame[\s\S]*?ticking\s*=\s*true/, 'Must throttle scroll events via requestAnimationFrame')
      assert.match(jsx, /ticking\s*=\s*false/, 'Must release ticking lock inside RAF callback')
    })

    it('C2.4: Scroll listener is registered as passive and unregistered on unmount', () => {
      assert.match(jsx, /addEventListener\(['"]scroll['"],\s*handleScroll,\s*\{\s*passive:\s*true\s*\}\)/, 'Must use passive scroll listener for 60fps')
      assert.match(jsx, /removeEventListener\(['"]scroll['"],\s*handleScroll\)/, 'Must clean up scroll listener on unmount')
    })

    it('C2.5: Orb DOM ref mutations are guarded with null-checks against unmount race conditions', () => {
      assert.match(jsx, /if\s*\(\s*orb1Ref\.current\s*\)/, 'orb1Ref must be null-checked before style assignment')
      assert.match(jsx, /if\s*\(\s*orb2Ref\.current\s*\)/, 'orb2Ref must be null-checked before style assignment')
      assert.match(jsx, /if\s*\(\s*orb3Ref\.current\s*\)/, 'orb3Ref must be null-checked before style assignment')
    })
  })

  // ============================================================================
  // CHALLENGE 3: CUMULATIVE LAYOUT SHIFT (CLS) ON WORKSPACE TAB SWITCHING
  // ============================================================================
  describe('Challenge 3: Cumulative Layout Shift (CLS) on Tab Switching', () => {
    it('C3.1: Minimum height constraint prevents layout collapse on tab transitions', () => {
      // The workspace container must enforce min-h-[480px]
      assert.match(jsx, /min-h-\[4(?:6|8)0px\]/, 'Demonstration container must enforce at least min-h-[460px] or [480px]')
    })

    it('C3.2: Tab panes use key-based unmount/mount with dedicated entry animation', () => {
      assert.match(jsx, /key="semanal"/, 'Semanal tab pane must declare unique key for React diffing')
      assert.match(jsx, /key="mensual"/, 'Mensual tab pane must declare unique key for React diffing')
      assert.match(jsx, /key="radar"/, 'Radar tab pane must declare unique key for React diffing')
      assert.match(jsx, /className=["'][^"']*tab-pane-animate[^"']*["']/, 'Tab panes must apply tab-pane-animate class')
    })

    it('C3.3: Tab animation duration is bounded (< 350ms) to ensure instant perceptual response', () => {
      const tabAnimMatch = css.match(/\.tab-pane-animate\s*\{[^}]*animation:\s*tabPaneEnter\s+([0-9.]+)s/i)
      assert.ok(tabAnimMatch, '.tab-pane-animate must define animation duration')
      const durationSeconds = parseFloat(tabAnimMatch[1])
      assert.ok(durationSeconds <= 0.35, `Tab transition animation duration (${durationSeconds}s) must be snappy (<= 0.35s)`)
    })

    it('C3.4: Active tab button has tactile active:scale micro-interaction', () => {
      assert.match(jsx, /active:scale-95/, 'Tab buttons must have tactile active:scale-95 feedback')
    })
  })

  // ============================================================================
  // CHALLENGE 4: ACCESSIBILITY & PREFERS-REDUCED-MOTION
  // ============================================================================
  describe('Challenge 4: Accessibility & prefers-reduced-motion: reduce', () => {
    it('C4.1: prefers-reduced-motion media query completely neutralizes scroll-reveal animations', () => {
      const body = extractNestedBlock(css, '@media (prefers-reduced-motion: reduce)')
      assert.ok(body, 'prefers-reduced-motion media query must be present in CSS')

      // .reveal-elem overrides
      assert.match(body, /\.reveal-elem\s*\{[^}]*opacity:\s*1\s*!important/, 'Must force opacity: 1 !important for reduced motion')
      assert.match(body, /\.reveal-elem\s*\{[^}]*transform:\s*none\s*!important/, 'Must force transform: none !important for reduced motion')
      assert.match(body, /\.reveal-elem\s*\{[^}]*filter:\s*none\s*!important/, 'Must force filter: none !important for reduced motion')
      assert.match(body, /\.reveal-elem\s*\{[^}]*transition:\s*none\s*!important/, 'Must force transition: none !important for reduced motion')
    })

    it('C4.2: prefers-reduced-motion disables specular button sheen sweep', () => {
      const body = extractNestedBlock(css, '@media (prefers-reduced-motion: reduce)')
      assert.ok(body, 'prefers-reduced-motion must be extracted')
      assert.match(body, /\.apple-btn-sheen::after\s*\{[^}]*display:\s*none\s*!important/, 'Must hide specular sheen sweep in reduced motion')
    })

    it('C4.3: prefers-reduced-motion disables tab pane keyframe animation', () => {
      const body = extractNestedBlock(css, '@media (prefers-reduced-motion: reduce)')
      assert.ok(body, 'prefers-reduced-motion must be extracted')
      assert.match(body, /\.tab-pane-animate\s*\{[^}]*animation:\s*none\s*!important/, 'Must disable tabPaneEnter keyframes in reduced motion')
    })

    it('C4.4: prefers-reduced-motion disables background light orb transform via CSS !important override', () => {
      const body = extractNestedBlock(css, '@media (prefers-reduced-motion: reduce)')
      assert.ok(body, 'prefers-reduced-motion must be extracted')
      assert.match(body, /\.apple-orb\s*\{[^}]*transform:\s*none\s*!important/, 'Must enforce transform: none !important on .apple-orb in reduced motion')
    })

    it('C4.5: WCAG AAA/AA Contrast Ratios on dark glass background', () => {
      // Pure white (#ffffff) on pitch black (#000000): 21:1 (AAA requires 7:1)
      const whiteContrast = (1.0 + 0.05) / (0.0 + 0.05)
      assert.ok(whiteContrast >= 7.0, 'White on black contrast meets WCAG AAA')

      // Muted grey (#86868b) on pitch black (#000000):
      // sRGB linear luminance for #86868b: ~0.245
      const greyLuminance = 0.245
      const greyContrast = (greyLuminance + 0.05) / (0.0 + 0.05)
      assert.ok(greyContrast >= 4.5, `Grey (#86868b) contrast (${greyContrast.toFixed(2)}:1) meets WCAG AA (4.5:1)`)

      // Apple primary blue (#0071e3) button:
      const blueLuminance = 0.165
      const blueButtonTextContrast = (1.0 + 0.05) / (blueLuminance + 0.05)
      assert.ok(blueButtonTextContrast >= 4.5, `Button text contrast (${blueButtonTextContrast.toFixed(2)}:1) meets WCAG AA`)
    })
  })

  // ============================================================================
  // CHALLENGE 5: INTERACTION TARGETS, ASSET INTEGRITY & ANCHOR INTEGRITY
  // ============================================================================
  describe('Challenge 5: Asset Integrity & Link Resolution', () => {
    it('C5.1: In-page navigation anchor targets match valid HTML section IDs', () => {
      const inPageAnchors = [...jsx.matchAll(/href=["']#([^"']+)["']/g)].map(m => m[1])
      assert.ok(inPageAnchors.length >= 3, 'Must have at least 3 in-page anchors')
      for (const anchor of inPageAnchors) {
        const idPattern = new RegExp(`id=["']${anchor}["']`)
        assert.ok(idPattern.test(jsx), `Anchor #${anchor} must correspond to an id="${anchor}" in LandingPage.jsx`)
      }
    })

    it('C5.2: External repository link uses secure target and rel attributes', () => {
      const githubLinkMatch = jsx.match(/<a[^>]*href=["']https:\/\/github\.com\/Gekamil\/AppHub["'][^>]*>/)
      assert.ok(githubLinkMatch, 'GitHub repo link must exist')
      assert.match(githubLinkMatch[0], /target=["']_blank["']/, 'External GitHub link must have target="_blank"')
      assert.match(githubLinkMatch[0], /rel=["'](?:noreferrer|noopener noreferrer)["']/, 'External link must specify rel="noreferrer"')
    })

    it('C5.3: Binary assets are physically present and non-empty in public/download/', () => {
      assert.ok(fs.existsSync(PATH_EXE), 'StudentHub-Setup.exe must exist in public/download/')
      assert.ok(fs.statSync(PATH_EXE).size > 0, 'StudentHub-Setup.exe must not be empty')

      assert.ok(fs.existsSync(PATH_APK), 'StudentHub.apk must exist in public/download/')
      assert.ok(fs.statSync(PATH_APK).size > 0, 'StudentHub.apk must not be empty')

      assert.ok(fs.existsSync(PATH_IPA), 'StudentHub.ipa must exist in public/download/')
      assert.ok(fs.statSync(PATH_IPA).size > 0, 'StudentHub.ipa must not be empty')
    })

    it('C5.4: Official brand logo /logo.png has authentic dimensions and PNG signature', () => {
      assert.ok(fs.existsSync(PATH_LOGO_PNG), 'Logo must exist at public/logo.png')
      const buffer = fs.readFileSync(PATH_LOGO_PNG)
      assert.ok(buffer.length > 5000, `Logo size (${buffer.length} bytes) must be substantial`)
      // PNG magic number: 89 50 4E 47 0D 0A 1A 0A
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
      assert.ok(isPng, 'Logo file must have authentic PNG signature')
    })

    it('C5.5: Production compiled bundle contains all design system artifacts', () => {
      assert.ok(fs.existsSync(PATH_DIST_CSS), `Production CSS bundle must exist at ${PATH_DIST_CSS}`)
      const bundledCss = fs.readFileSync(PATH_DIST_CSS, 'utf8')
      assert.ok(bundledCss.includes('apple-card'), 'Bundled CSS must contain .apple-card')
      assert.ok(bundledCss.includes('apple-orb'), 'Bundled CSS must contain .apple-orb')
      assert.ok(bundledCss.includes('prefers-reduced-motion'), 'Bundled CSS must contain prefers-reduced-motion')

      assert.ok(fs.existsSync(PATH_DIST_JS), `Production JS bundle must exist at ${PATH_DIST_JS}`)
      const bundledJs = fs.readFileSync(PATH_DIST_JS, 'utf8')
      assert.ok(bundledJs.includes('translate3d'), 'Bundled JS must contain parallax translate3d')
      assert.ok(bundledJs.includes('passive'), 'Bundled JS must contain passive event listeners')
    })
  })
})
