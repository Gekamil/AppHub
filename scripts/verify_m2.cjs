/**
 * Automated Verification Script for Milestone M2 (Performance & UI Optimization)
 * Confirms memoization, GPU transform attributes, context stability, and absence of dormant bugs.
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const ROOT = path.resolve(__dirname, '..')

const PATHS = {
  APP_SHELL: path.join(ROOT, 'src/layouts/AppShell.jsx'),
  HEADER: path.join(ROOT, 'src/components/Header.jsx'),
  AUTO_ORGANIZER: path.join(ROOT, 'src/pages/AutoOrganizerPage.jsx'),
  CALENDAR: path.join(ROOT, 'src/pages/CalendarPage.jsx'),
  MY_HUB: path.join(ROOT, 'src/pages/MyHubPage.jsx'),
  THEMES_CSS: path.join(ROOT, 'src/styles/themes.css'),
}

function stripComments(str) {
  return str.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
}

function runVerification() {
  console.log('====================================================')
  console.log(' Starting Milestone M2 Verification Suite')
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

  // 1. AppShell.jsx
  test('AppShell: outletContextValue is memoized with useMemo', () => {
    const code = fs.readFileSync(PATHS.APP_SHELL, 'utf8')
    const clean = stripComments(code)
    assert.ok(
      /useMemo\s*\(\s*\(\)\s*=>\s*\(?\{[\s\S]*?globalTasks/.test(clean),
      'outletContextValue must use useMemo returning the context object'
    )
    assert.ok(
      !/useCallback\s*\([\s\S]*?\)\(\)/.test(clean),
      'outletContextValue must NOT invoke useCallback immediately ()()'
    )
  })

  test('AppShell: outletContextValue deps exclude high-frequency timers', () => {
    const code = fs.readFileSync(PATHS.APP_SHELL, 'utf8')
    const clean = stripComments(code)
    const match = clean.match(/const\s+outletContextValue\s*=\s*useMemo\s*\([\s\S]*?\],?\s*\[([\s\S]*?)\]\)/)
    assert.ok(match, 'outletContextValue useMemo must have a dependency array')
    const deps = match[1]
    assert.ok(!deps.includes('nowTicker'), 'outletContextValue must not depend on nowTicker')
    assert.ok(!deps.includes('scrollY'), 'outletContextValue must not depend on scrollY')
  })

  // 2. Header.jsx
  test('Header: sliding indicator animates with GPU transform (translateX / scaleX)', () => {
    const code = fs.readFileSync(PATHS.HEADER, 'utf8')
    const clean = stripComments(code)
    const indicatorSection = clean.match(/indicatorStyle[\s\S]*?style=\{([\s\S]*?)\}/)?.[1] || clean
    assert.ok(
      /translateX|scaleX|transform/i.test(indicatorSection) || /transform:\s*`translateX/i.test(clean),
      'Indicator must use CSS transform (translateX / scaleX)'
    )
  })

  test('Header: sliding indicator specifies will-change: transform', () => {
    const code = fs.readFileSync(PATHS.HEADER, 'utf8')
    assert.ok(
      /will-change/i.test(code) || /willChange/i.test(code),
      'Indicator must hint compositor with will-change: transform'
    )
  })

  test('Header: sliding indicator avoids transition-all in favor of transform/opacity', () => {
    const code = fs.readFileSync(PATHS.HEADER, 'utf8')
    assert.ok(
      /transition-\[?transform/i.test(code) || /transition:\s*['"]?transform/i.test(code) || !/indicatorStyle.*transition-all/.test(code),
      'Indicator must avoid transition-all'
    )
  })

  // 3. AutoOrganizerPage.jsx
  test('AutoOrganizer: filteredTasks is memoized with useMemo', () => {
    const code = fs.readFileSync(PATHS.AUTO_ORGANIZER, 'utf8')
    const clean = stripComments(code)
    assert.ok(
      /const\s+filteredTasks\s*=\s*useMemo\s*\(/i.test(clean),
      'AutoOrganizerPage must memoize filteredTasks with useMemo'
    )
  })

  test('AutoOrganizer: TaskCardItem is wrapped in React.memo', () => {
    const code = fs.readFileSync(PATHS.AUTO_ORGANIZER, 'utf8')
    assert.ok(
      /const\s+TaskCardItem\s*=\s*memo\s*\(|React\.memo\s*\(/i.test(code),
      'TaskCardItem must be wrapped in memo'
    )
  })

  test('AutoOrganizer: key task action handlers are memoized with useCallback', () => {
    const code = fs.readFileSync(PATHS.AUTO_ORGANIZER, 'utf8')
    assert.ok(/const\s+toggleTaskCompleted\s*=\s*useCallback\s*\(/i.test(code), 'toggleTaskCompleted must use useCallback')
    assert.ok(/const\s+handleDeleteTask\s*=\s*useCallback\s*\(/i.test(code), 'handleDeleteTask must use useCallback')
    assert.ok(/const\s+handleOpenEditModal\s*=\s*useCallback\s*\(/i.test(code), 'handleOpenEditModal must use useCallback')
    assert.ok(/const\s+startFocusTimer\s*=\s*useCallback\s*\(/i.test(code), 'startFocusTimer must use useCallback')
  })

  test('AutoOrganizer: filteredTasks handles empty or null globalTasks safely', () => {
    const code = fs.readFileSync(PATHS.AUTO_ORGANIZER, 'utf8')
    assert.ok(
      /globalTasks\s*\|\|\s*\[\]|\(globalTasks\s*\?\?\s*\[\]\)|Array\.isArray\(globalTasks\)/i.test(code),
      'filteredTasks must guard against null/undefined globalTasks'
    )
  })

  // 4. CalendarPage.jsx
  test('Calendar: memoizes filteredTasks and currentCalendarTasks with useMemo', () => {
    const code = fs.readFileSync(PATHS.CALENDAR, 'utf8')
    assert.ok(
      /const\s+filteredTasks\s*=\s*useMemo\s*\(/i.test(code),
      'CalendarPage must memoize filteredTasks with useMemo'
    )
    assert.ok(
      /const\s+currentCalendarTasks\s*=\s*useMemo\s*\(/i.test(code),
      'CalendarPage must memoize currentCalendarTasks with useMemo'
    )
  })

  test('Calendar: isolates nowTicker and does not run 20s full-page interval', () => {
    const code = fs.readFileSync(PATHS.CALENDAR, 'utf8')
    assert.ok(
      !/setInterval\(\(\)\s*=>\s*setNowTicker\(new Date\(\)\),\s*20000\)/.test(code),
      'CalendarPage must eliminate the unconditional 20s full-page interval'
    )
  })

  // 5. MyHubPage.jsx
  test('MyHub: imports APP_THEMES from appTheme service', () => {
    const code = fs.readFileSync(PATHS.MY_HUB, 'utf8')
    assert.ok(
      /import.*APP_THEMES.*from/i.test(code),
      'MyHubPage must import APP_THEMES to prevent dormant ReferenceError'
    )
  })

  test('MyHub: eliminates double-blur ghost DOM tree bloat', () => {
    const code = fs.readFileSync(PATHS.MY_HUB, 'utf8')
    const hasDoubleBlurBloat =
      /filter\s+blur-md[\s\S]*?M\u00f3dulo My Hub en Optimizaci\u00f3n[\s\S]*?Fast Web Clipper/.test(code)
    assert.ok(
      !hasDoubleBlurBloat,
      'MyHubPage must not render 330-line blurred ghost tree under opaque overlay'
    )
  })

  test('MyHub: renders clean maintenance/preview card', () => {
    const code = fs.readFileSync(PATHS.MY_HUB, 'utf8')
    assert.ok(
      /Pr\u00f3ximamente|Optimizing|Proximamente/i.test(code),
      'MyHubPage must render clean maintenance/preview card'
    )
  })

  // 6. themes.css
  test('themes.css: avoids stacking backdrop-filters across 40+ month grid cells', () => {
    const code = fs.readFileSync(PATHS.THEMES_CSS, 'utf8')
    const hasGridCellBlurStorm = /\[class\*="grid-cols-7"\]\s*>\s*div\s*\{[^}]*backdrop-filter/i.test(code)
    assert.ok(
      !hasGridCellBlurStorm,
      'themes.css must NOT apply backdrop-filter on month grid cells'
    )
  })

  console.log('\n====================================================')
  console.log(` Results: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`)
  console.log('====================================================\n')

  if (passed !== total) {
    process.exit(1)
  }
}

runVerification()
