#!/usr/bin/env node
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '../..')
const TEST_SUITE = path.join(__dirname, 'landing_page_suite.test.mjs')

console.log('='.repeat(72))
console.log('  STUDENTHUB APPLE-STYLE LANDING PAGE E2E TEST RUNNER')
console.log('  Tiers 1-4: Feature Coverage, Boundaries, Cross-Feature & Scenarios')
console.log('='.repeat(72))
console.log(`Working Directory: ${PROJECT_ROOT}`)
console.log(`Test Suite File:   ${TEST_SUITE}`)
console.log(`Node Runtime:      ${process.version}\n`)

const startTime = Date.now()

const child = spawn(
  process.execPath,
  ['--test', TEST_SUITE],
  {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  }
)

child.on('error', (err) => {
  console.error('\n❌ Failed to spawn test process:', err)
  process.exit(1)
})

child.on('close', (code) => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log('\n' + '='.repeat(72))
  if (code === 0) {
    console.log(`  🎉 ALL E2E TESTS PASSED SUCCESSFULLY! (${duration}s)`)
    console.log('  All Tier 1-4 verification criteria met according to PROJECT.md.')
  } else {
    console.log(`  ❌ E2E TEST RUN FINISHED WITH FAILURES (Exit code: ${code}) (${duration}s)`)
  }
  console.log('='.repeat(72) + '\n')
  process.exit(code ?? 1)
})
