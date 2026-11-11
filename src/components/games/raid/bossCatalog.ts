import type { BossKind, BriefingBossKind } from './types'

export type GenericBossKind = Exclude<BossKind, BriefingBossKind>
export const GENERIC_BOSS_KINDS: readonly GenericBossKind[] = ['carrier', 'orb', 'mantis', 'serpent', 'hydra', 'gate', 'super']
const CYCLE: readonly BossKind[] = ['carrier', 'orb', 'mantis', 'serpent', 'hydra', 'gate']

/** Campaign attack-class cycle, shared by spawning and profile/art selection. */
export function getCampaignBossKind(stage: number): BossKind {
  if (stage === 15) return 'final'
  if (stage === 10) return 'snake'
  if (stage === 5) return 'squid'
  if (stage % 5 === 0) return 'super'
  return CYCLE[((Math.floor(stage) - 1) % CYCLE.length + CYCLE.length) % CYCLE.length]
}

export type CampaignBossArt = {
  stage: number
  kind: GenericBossKind
  name: string
  assetPath: string
}
export const CAMPAIGN_BOSS_ART: readonly CampaignBossArt[] = [
  { stage: 1, kind: 'carrier', name: 'Crimson Bastion', assetPath: 'assets/bosses/stage-01-crimson-bastion-v1.webp' },
  { stage: 2, kind: 'orb', name: 'Amethyst Orrery', assetPath: 'assets/bosses/stage-02-amethyst-orrery-v1.webp' },
  { stage: 3, kind: 'mantis', name: 'Verdant Reaper', assetPath: 'assets/bosses/stage-03-verdant-reaper-v1.webp' },
  { stage: 4, kind: 'serpent', name: 'Tidal Razor', assetPath: 'assets/bosses/stage-04-tidal-razor-v1.webp' },
  { stage: 6, kind: 'gate', name: 'Cinder Gate', assetPath: 'assets/bosses/stage-06-cinder-gate-v1.webp' },
  { stage: 7, kind: 'carrier', name: 'Ashen Ark', assetPath: 'assets/bosses/stage-07-ashen-ark-v1.webp' },
  { stage: 8, kind: 'orb', name: 'Prism Sovereign', assetPath: 'assets/bosses/stage-08-prism-sovereign-v1.webp' },
  { stage: 9, kind: 'mantis', name: 'Scythe Regent', assetPath: 'assets/bosses/stage-09-scythe-regent-v1.webp' },
  { stage: 11, kind: 'hydra', name: 'Triarch Hydra', assetPath: 'assets/bosses/stage-11-triarch-hydra-v1.webp' },
  { stage: 12, kind: 'gate', name: 'Null Cathedral', assetPath: 'assets/bosses/stage-12-null-cathedral-v1.webp' },
  { stage: 13, kind: 'carrier', name: 'Eclipse Dreadnought', assetPath: 'assets/bosses/stage-13-eclipse-dreadnought-v1.webp' },
  { stage: 14, kind: 'orb', name: 'Eventide Nexus', assetPath: 'assets/bosses/stage-14-eventide-nexus-v1.webp' },
]

const SUPER_BOSS_ART = CAMPAIGN_BOSS_ART.find((art) => art.stage === 13)

/** Stage identity is chosen once on spawn and carried by the co-op snapshot.
 * Endless uses the latest eligible design; older packets get a stable class default.
 * Endless super ships use the supreme carrier hull, which has both fan and radial armament.
 */
export function getGenericBossArt(kind: BossKind | null, stage?: number): CampaignBossArt | undefined {
  const family = kind === 'super' ? 'carrier' : kind
  let selected: CampaignBossArt | undefined
  for (const art of CAMPAIGN_BOSS_ART) {
    if (art.kind !== family) continue
    if (!selected || (stage !== undefined && art.stage <= stage)) selected = art
  }
  return kind === 'super' ? SUPER_BOSS_ART : selected
}
