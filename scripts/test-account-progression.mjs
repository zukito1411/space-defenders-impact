import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64')

const storage = new Map()
const window = Object.assign(new EventTarget(), {
  location: { hostname: 'localhost' },
  crypto: globalThis.crypto,
  localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  },
})
globalThis.window = window
const navigator = { onLine: false }
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: navigator })
const accounts = moduleUrl(read('src/leaderboards.ts').replaceAll('import.meta.env', '({})'))
const progress = dev => import(moduleUrl(read('src/progression.ts')
  .replaceAll('import.meta.env.DEV', String(dev))
  .replace("'./leaderboards'", JSON.stringify(accounts))
  .replace("'./components/games/raid/progressStorage'", JSON.stringify(moduleUrl(read('src/components/games/raid/progressStorage.ts'))))
  .replace(/^import \{ ENDLESS_UNLOCK_STORAGE_KEY \}.*$/m, "const ENDLESS_UNLOCK_STORAGE_KEY = 'spaceImpactDefenseEndlessUnlocked'")))

const account = await import(accounts)
const released = await progress(false)
const development = await progress(true)
const allOff = { trail: false, aura: false, frame: false }

account.saveStoredPlayerName('Previous Pilot')
assert.equal(released.isLocalProgressionTestHost(), false, 'Packaged Android uses localhost in a production build')
assert.equal(released.isCoreLanderUnlocked(released.loadProgress()), false)
assert.equal(released.isGradiusRaidEndlessUnlocked(released.loadProgress()), false)
assert.deepEqual(released.getEquippedShipCosmetics(released.loadProgress(), 'rocket'), allOff)
assert.equal(development.isCoreLanderUnlocked(development.loadProgress()), true)

for (const choice of Object.keys(allOff)) development.setShipCosmeticEquipped('rocket', choice, false)
assert.deepEqual(development.getEquippedShipCosmetics(development.loadProgress(), 'rocket'), allOff)

const earned = released.createEmptyProgress()
earned.shipMastery.rocket = {
  runs: 1, xp: 5000, level: 3, victories: 1,
  bestScore: released.SHIP_COSMETIC_SINGLE_RUN_SCORE,
  totalScore: released.SHIP_COSMETIC_TOTAL_SCORE,
}
released.saveProgress(earned, false)
for (const choice of Object.keys(allOff)) released.setShipCosmeticEquipped('rocket', choice, false)
const local = released.loadProgress()
assert.deepEqual(released.getEquippedShipCosmetics(local, 'rocket'), allOff)
assert.deepEqual(released.getEquippedShipCosmetics(released.mergeProgressForSync(local, earned), 'rocket'), allOff)

const previousId = account.getOrCreateStoredPlayerId()
account.saveStoredRecoveryCode('PREVIOUS-CODE')
const pendingBefore = released.getPendingProgressSyncToken()
const registration = await account.registerPlayerName('New Pilot', true)
assert.equal(registration.offline, true)
assert.notEqual(registration.playerId, previousId)
assert.equal(registration.recoveryCode, '')
assert.equal(account.getOrCreateStoredPlayerId(), previousId, 'Pending registration must not swap the active ID')
assert.equal(released.getPendingProgressSyncToken(), pendingBefore)

navigator.onLine = true
globalThis.fetch = async (_url, options) => {
  const { playerName, playerId } = JSON.parse(options.body)
  assert.equal(playerName, 'New Pilot')
  assert.notEqual(playerId, previousId)
  return Response.json({ registered: true, playerId, playerName, recoveryCode: 'NEW-CODE' })
}
const online = await account.registerPlayerName('New Pilot', true)
assert.equal(online.offline, undefined)
assert.equal(online.recoveryCode, 'NEW-CODE')
assert.equal(account.getStoredRecoveryCode(), 'PREVIOUS-CODE')
assert.equal(account.getOrCreateStoredPlayerId(), previousId)

for (const key of ['gradiusRaidUnlockedStage', 'gradiusRaidCheckpointStage', 'spaceImpactDefenseEndlessUnlocked']) {
  window.localStorage.setItem(key, 'true')
}
released.resetProgressForNewAccount(false)
assert.deepEqual(released.loadProgress(), released.createEmptyProgress())
assert.equal(released.getPendingProgressSyncToken(), null)
assert.equal(window.localStorage.getItem('gradiusRaidCheckpointStage'), null)
assert.equal(window.localStorage.getItem('gradiusRaidUnlockedStage'), null)
console.log('Release-mode progression, independent cosmetic choices, and new account isolation passed')
