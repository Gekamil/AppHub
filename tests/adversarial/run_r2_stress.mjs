import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '../..')
const SUITE_PATH = path.join(__dirname, 'r2_stress_r4_r5_r6.test.mjs')

console.log('='.repeat(78))
console.log('  STUDENTHUB ADVERSARIAL STRESS TEST RUNNER (CHALLENGER 2 — R4, R5, R6)')
console.log('  Scope: News Persistence & Physics (R4/R5), AI Intent & WhatsApp (R6)')
console.log('='.repeat(78))
console.log(`Working Directory: ${PROJECT_ROOT}`)
console.log(`Suite File:        ${SUITE_PATH}`)
console.log(`Node Runtime:      ${process.version}\n`)

const startTime = Date.now()
const result = spawnSync(process.execPath, ['--test', SUITE_PATH], {
  cwd: PROJECT_ROOT,
  stdio: 'inherit',
  env: process.env,
})

const duration = ((Date.now() - startTime) / 1000).toFixed(2)
console.log('\n' + '='.repeat(78))
if (result.status === 0) {
  console.log(`  🎉 ALL ADVERSARIAL CHALLENGES PASSED! (${duration}s)`)
} else {
  console.log(`  ⚠️ ADVERSARIAL VULNERABILITIES DETECTED (${duration}s)`)
  console.log('  Empirical failure modes identified in R4/R5 persistence and R6 intent.')
  console.log('  See detailed diagnostic findings in .agents/teamwork/challenger_r2_2/handoff.md')
}
console.log('='.repeat(78))

process.exit(result.status ?? 1)
