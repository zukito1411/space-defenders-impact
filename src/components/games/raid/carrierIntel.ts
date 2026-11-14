import { getRaidText, getReleaseText, type LanguageCode } from '../../../i18n'
import { getCampaignBossKind, getGenericBossArt } from './bossCatalog'
import { cosmicArrival } from './cosmos'
import { getCampaignOpeningIntel } from './campaignComms'
import { getRaidStageEncounter } from './stageEncounters'
import type { BossKind, RaidMode } from './types'

const bossCodex = {
  squid: 'abyss_squid',
  snake: 'serpent_guardian',
  final: 'orbital_fortress',
  devil: 'devil_gundam',
} as const

const copy = {
  en: { order: 'Intercept', heading: 'Next contact' },
  zh: { order: '拦截', heading: '下一个目标' },
  ja: { order: '迎撃', heading: '次の目標' },
  ko: { order: '요격', heading: '다음 표적' },
} as const

export function getCarrierSectorIntel(language: LanguageCode, mode: RaidMode, stage: number, recoveryBoss?: BossKind) {
  if (!recoveryBoss && mode === 'campaign' && stage === 1) return getCampaignOpeningIntel(language)
  const words = copy[language] ?? copy.en
  const text = getRaidText(language)
  const kind = recoveryBoss ?? (mode === 'endless' ? undefined : getCampaignBossKind(stage))
  const codexKey = kind === 'squid' || kind === 'snake' || kind === 'final' || kind === 'devil' ? bossCodex[kind] : undefined
  const target = codexKey ? getReleaseText(language).codexMap[codexKey].title : kind ? getGenericBossArt(kind, stage)?.name : undefined
  const arrival = mode === 'endless' || recoveryBoss === 'devil' ? undefined : cosmicArrival(stage, true).name
  const formation = (mode === 'campaign' && recoveryBoss !== 'devil') || (!recoveryBoss && mode === 'endless') ? text.hud.formationIntel[getRaidStageEncounter(stage).wings[0][0]] : undefined
  const campaignBossStage = mode === 'campaign' && (stage === 5 || stage === 10 || stage === 15)
  const showTarget = recoveryBoss || campaignBossStage
  return {
    objective: target && showTarget ? `${words.order} ${target}` : undefined,
    goals: showTarget && target ? [arrival ?? 'Mesiah', formation ?? words.heading, target] : undefined,
  }
}
