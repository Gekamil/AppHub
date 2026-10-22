#!/usr/bin/env node
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '../..')
const TEST_SUITE = path.join(__dirname, 'r2_comprehensive_suite.test.mjs')

console.log('='.repeat(78))
console.log('  STUDENTHUB R2 COMPREHENSIVE E2E TEST RUNNER (R1–R6)')
console.log('  Tiers 1-4: Feature Coverage, Boundaries, Cross-Feature & Real-World')
console.log('='.repeat(78))
console.log(`Working Directory: ${PROJECT_ROOT}`)
console.log(`Test Suite File:   ${TEST_SUITE}`)
console.log(`Node Runtime:      ${process.version}\n`)

const startTime = Date.now()

const child = spawn(
  process.execPath,
  ['--test', TEST_SUITE],
  {
    cwd: PROJECT_ROOT,
    env: { ...process.env, FORCE_COLOR: '1' }
  }
)

let stdoutData = ''
let stderrData = ''

child.stdout.on('data', (data) => {
  const str = data.toString()
  stdoutData += str
  process.stdout.write(str)
})

child.stderr.on('data', (data) => {
  const str = data.toString()
  stderrData += str
  process.stderr.write(str)
})

child.on('error', (err) => {
  console.error('\n❌ Failed to spawn test process:', err)
  process.exit(1)
})

child.on('close', (code) => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  const combined = stdoutData + stderrData

  // Parse pass/fail counts from node:test TAP/spec summary
  const passMatch = combined.match(/ℹ pass (\d+)/) || combined.match(/pass:\s*(\d+)/i)
  const failMatch = combined.match(/ℹ fail (\d+)/) || combined.match(/fail:\s*(\d+)/i)
  const testsMatch = combined.match(/ℹ tests (\d+)/) || combined.match(/tests:\s*(\d+)/i)

  const passCount = passMatch ? parseInt(passMatch[1], 10) : 0
  const failCount = failMatch ? parseInt(failMatch[1], 10) : 0
  const totalCount = testsMatch ? parseInt(testsMatch[1], 10) : (passCount + failCount)

  console.log('\n' + '='.repeat(78))
  console.log('  📊 R2 TEST EXECUTION SUMMARY')
  console.log('='.repeat(78))
  console.log(`  Total Planned Tests:  72`)
  console.log(`  Executed Tests:       ${totalCount}`)
  console.log(`  Passing Tests:        ${passCount}`)
  console.log(`  Failing / Pending:    ${failCount}`)
  console.log(`  Execution Time:       ${duration}s`)
  console.log('-'.repeat(78))
  console.log('  Tier Breakdown:')
  console.log('    • Tier 1: Feature Coverage (R1-R6)          [30 tests planned]')
  console.log('    • Tier 2: Boundary & Corner Cases (R1-R6)   [30 tests planned]')
  console.log('    • Tier 3: Cross-Feature Combinations (R1-R6)[6 tests planned]')
  console.log('    • Tier 4: Real-World Scenarios (R1-R6)      [6 tests planned]')
  console.log('-'.repeat(78))

  if (code === 0) {
    console.log(`  🎉 ALL R2 E2E TESTS PASSED SUCCESSFULLY! (${duration}s)`)
    console.log('  All Tier 1-4 verification criteria met for Requirements R1 through R6.')
  } else {
    console.log(`  ℹ R2 E2E TEST RUN EXECUTED (${passCount} passed, ${failCount} pending/failing)`)
    console.log('  Pending milestone tests establish target specifications for Worker agents.')
  }
  console.log('='.repeat(78) + '\n')
  process.exit(code ?? 1)
})
