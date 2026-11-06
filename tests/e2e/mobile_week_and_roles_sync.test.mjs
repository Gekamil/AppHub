import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')

describe('Mobile Week Mode Lateral View & Persistent Roles Sync', () => {
  it('1.1: pruneOrphanImportedRoles preserves custom user roles when activeTasks is empty', async () => {
    // Setup a mock localStorage and window event system
    const store = new Map()
    global.localStorage = {
      getItem: (key) => store.get(key) || null,
      setItem: (key, val) => store.set(key, String(val)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    }
    global.window = {
      dispatchEvent: () => true,
      location: { origin: 'http://localhost:5173' },
    }

    const { getSharedRoles, saveSharedRoles, pruneOrphanImportedRoles, findOrCreateSharedRole } = await import(
      '../../src/services/sharedRoles.js'
    )

    // User creates a custom role 'Investigacion'
    const newRole = findOrCreateSharedRole('Investigacion', 'science', false)
    assert.ok(newRole, 'Created role must exist')
    assert.strictEqual(newRole.name, 'Investigacion')
    assert.strictEqual(newRole.isExternalSync, false)

    // When global tasks is empty (e.g. on page mount or before tasks load)
    const afterEmptyPrune = pruneOrphanImportedRoles([])
    const foundRole = afterEmptyPrune.find((r) => r.name === 'Investigacion')
    assert.ok(foundRole, 'User role MUST NOT be pruned when activeTasks is empty')

    // Even if activeTasks has tasks for other roles, user role must not be pruned because isExternalSync is false
    const afterTasksPrune = pruneOrphanImportedRoles([{ context: 'University' }])
    const stillFound = afterTasksPrune.find((r) => r.name === 'Investigacion')
    assert.ok(stillFound, 'User role without isExternalSync MUST NEVER be pruned as an orphan')

    // However, an external synced role without tasks SHOULD be pruned
    const externalRole = findOrCreateSharedRole('CalendarExternalSync', 'event', true)
    assert.strictEqual(externalRole.isExternalSync, true)
    const afterExternalPrune = pruneOrphanImportedRoles([{ context: 'University' }])
    const externalFound = afterExternalPrune.find((r) => r.name === 'CalendarExternalSync')
    assert.strictEqual(externalFound, undefined, 'External sync role with 0 tasks should be pruned')
  })

  it('1.2: firebase.js exports syncRolesToCloud and integrates with user cloud sync', () => {
    const firebaseCode = fs.readFileSync(path.join(projectRoot, 'src/services/firebase.js'), 'utf-8')
    assert.ok(firebaseCode.includes('export const syncRolesToCloud'), 'firebase.js must export syncRolesToCloud')
    assert.ok(firebaseCode.includes('api/user/sync'), 'syncRolesToCloud must call api/user/sync')
    assert.ok(firebaseCode.includes('shared_roles_updated'), 'firebase.js must emit shared_roles_updated on cloud sync')
  })

  it('1.3: whatsapp-bridge.js handles roles in /api/user/sync and broadcasts changes', () => {
    const bridgeCode = fs.readFileSync(path.join(projectRoot, 'server/whatsapp-bridge.js'), 'utf-8')
    assert.ok(bridgeCode.includes('let mergedRoles = payload.roles || payload.categories'), 'bridge must merge roles')
    assert.ok(bridgeCode.includes('roles: mergedRoles'), 'bridge must store roles in updatedUser')
    assert.ok(bridgeCode.includes('existingRolesJson !== mergedRolesJson'), 'bridge must track role change in hasChanged')
  })

  it('1.4: CalendarPage.jsx defines mobileWeekLayout and defaults to lateral', () => {
    const calendarCode = fs.readFileSync(path.join(projectRoot, 'src/pages/CalendarPage.jsx'), 'utf-8')
    assert.ok(calendarCode.includes('mobileWeekLayout'), 'CalendarPage must declare mobileWeekLayout state')
    assert.ok(calendarCode.includes("'lateral'"), "mobileWeekLayout must default to 'lateral'")
    assert.ok(calendarCode.includes('studenthub_mobile_week_layout'), 'mobileWeekLayout must persist in localStorage')
  })

  it('1.5: CalendarPage.jsx renders mobile lateral quick selector strip and toggle buttons', () => {
    const calendarCode = fs.readFileSync(path.join(projectRoot, 'src/pages/CalendarPage.jsx'), 'utf-8')
    assert.ok(calendarCode.includes('Lateral ↔'), 'CalendarPage must include Lateral toggle button')
    assert.ok(calendarCode.includes('Lista ↕'), 'CalendarPage must include Lista toggle button')
    assert.ok(calendarCode.includes('mobile-week-day-'), 'CalendarPage must set id for quick day target navigation')
    assert.ok(
      calendarCode.includes('overflow-x-auto snap-x snap-mandatory'),
      'CalendarPage must implement horizontal scroll-snap for lateral week view'
    )
  })

  it('1.6: CalendarPage.jsx handleSaveEvent sets both context and role and registers shared role', () => {
    const calendarCode = fs.readFileSync(path.join(projectRoot, 'src/pages/CalendarPage.jsx'), 'utf-8')
    assert.ok(calendarCode.includes('role: eventForm.context'), 'handleSaveEvent must persist both role and context')
    assert.ok(
      calendarCode.includes('findOrCreateSharedRole(eventForm.context'),
      'handleSaveEvent must register the role in sharedRoles'
    )
  })
})
