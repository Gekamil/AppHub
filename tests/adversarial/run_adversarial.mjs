import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '../..')
const SUITE_PATH = path.join(__dirname, 'stress_suite.test.mjs')

console.log('='.repeat(72))
console.log('  STUDENTHUB ADVERSARIAL STRESS TEST RUNNER (CHALLENGER_1)')
console.log('  Challenges 1-5: Responsiveness, Scroll Stress, CLS, A11y, Assets')
console.log('='.repeat(72))
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
console.log('\n' + '='.repeat(72))
if (result.status === 0) {
  console.log(`  🎉 ALL ADVERSARIAL CHALLENGES PASSED! (${duration}s)`)
  console.log('  The landing page implementation is robust against stress conditions.')
} else {
  console.error(`  ❌ ADVERSARIAL CHALLENGES FAILED! (exit code: ${result.status})`)
}
console.log('='.repeat(72))

process.exit(result.status ?? 1)
