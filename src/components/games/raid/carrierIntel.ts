import { getRaidText, getReleaseText, type LanguageCode } from '../../../i18n'
import { getCampaignBossKind, getGenericBossArt } from './bossCatalog'
import { cosmicArrival } from './cosmos'
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

const openingEvacuation = {
  en: { objective: 'Reopen Earth’s evacuation route', goals: ['Break the blockade', 'Protect the transports', 'Destroy the enemy carrier'] },
  zh: { objective: '打通地球撤离航线', goals: ['突破封锁', '保护运输船', '击沉敌方航母'] },
  ja: { objective: '地球の避難航路を開け', goals: ['封鎖を突破', '輸送船を守る', '敵空母を撃破'] },
  ko: { objective: '지구 대피 항로를 열어라', goals: ['봉쇄 돌파', '수송선 보호', '적 항모 격침'] },
}

export function getCarrierSectorIntel(language: LanguageCode, mode: RaidMode, stage: number, recoveryBoss?: BossKind) {
  if (!recoveryBoss && mode === 'campaign' && stage === 1) return openingEvacuation[language]
  const words = copy[language] ?? copy.en
  const text = getRaidText(language)
  const kind = recoveryBoss ?? (mode === 'endless' ? undefined : getCampaignBossKind(stage))
  const codexKey = kind === 'squid' || kind === 'snake' || kind === 'final' || kind === 'devil' ? bossCodex[kind] : undefined
  const target = codexKey ? getReleaseText(language).codexMap[codexKey].title : kind ? getGenericBossArt(kind, stage)?.name : undefined
  const arrival = mode === 'endless' || recoveryBoss === 'devil' ? undefined : cosmicArrival(stage, true).name
  const formation = (mode === 'campaign' && recoveryBoss !== 'devil') || (!recoveryBoss && mode === 'endless') ? text.hud.formationIntel[getRaidStageEncounter(stage).wings[0][0]] : undefined
  return {
    objective: target && recoveryBoss ? `${words.order} ${target}` : undefined,
    goals: recoveryBoss && target ? [arrival ?? 'Mesiah', formation ?? words.heading, target] : undefined,
  }
}
