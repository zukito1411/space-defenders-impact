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
  en: {
    heading: 'Next contact', order: 'Intercept', command: 'Command', tactical: 'Tactical', deck: 'Flight deck',
    orbit: 'Mesiah has the approach corridor. Your next target is',
    wing: 'Opening formation', reserve: 'Keep the fleet moving and prepare for the next contact.',
    cold: 'Clamps are locked and your engines are cold. Authorize launch when ready.',
    bridge: 'The crew has cut thrust for the briefing. Clear the bridge to resume pursuit.',
    squid: 'Stay outside the tentacle lanes and focus one split bubble at a time.',
    snake: 'Watch the poison curtain and steer through the open lane before the sweep reaches you.',
    final: 'Read the beam warnings early and keep a clear lane to escape the next sweep.',
    devil: 'DG-cell signature confirmed. Wait for the lunge warning to commit before dodging, and keep a lane open for the beam sweep.',
    super: 'The heavy carrier combines fan salvos with radial fire. Let the fan pass, then move through a gap between the radial shots.',
  },
  zh: {
    heading: '下一个目标', order: '拦截', command: '指挥部', tactical: '战术官', deck: '飞行甲板',
    orbit: 'Mesiah 已控制接近航道。下一个目标是',
    wing: '先头编队', reserve: '保持舰队前进，为下一个目标做好准备。',
    cold: '锁具已固定，引擎已关闭。准备好后批准出击。',
    bridge: '简报期间已关闭推力。下令后恢复追击。',
    squid: '避开触手攻击路线，逐一击破分裂气泡。',
    snake: '观察毒弹幕，在横扫到来前穿过空隙。',
    final: '提前观察光束预警，为下一次横扫留出退路。',
    devil: '确认 DG 细胞信号。等突进方向锁定后再闪避，并为光束横扫留出通道。',
    super: '重型航母会交替使用扇形齐射和放射弹幕。等扇形齐射通过后，从弹幕空隙穿过去。',
  },
  ja: {
    heading: '次の目標', order: '迎撃', command: '司令部', tactical: '戦術管制', deck: '飛行甲板',
    orbit: 'Mesiah が進入航路を確保した。次の目標は',
    wing: '先頭編隊', reserve: '艦隊の進行を維持し、次の交戦に備えろ。',
    cold: '拘束装置は固定済み。エンジンは停止中。準備ができたら発進を承認せよ。',
    bridge: '通信中は推力を切っている。指示があり次第、追撃を再開する。',
    squid: '触手の攻撃線を避け、分裂した泡を一つずつ処理しろ。',
    snake: '毒弾幕を見て、薙ぎ払いが来る前に空いた列を抜けろ。',
    final: 'ビームの予兆を読み、次の掃射から逃げる航路を確保しろ。',
    devil: 'DG細胞の反応を確認。突進方向が定まってから回避し、ビーム掃射に備えて退路を残せ。',
    super: '重空母は扇状の斉射と放射弾を使う。斉射をやり過ごし、放射弾の隙間を抜けろ。',
  },
  ko: {
    heading: '다음 표적', order: '요격', command: '사령부', tactical: '전술 관제', deck: '비행 갑판',
    orbit: 'Mesiah가 접근 항로를 확보했다. 다음 표적은',
    wing: '선두 편대', reserve: '함대의 진로를 유지하고 다음 교전에 대비하라.',
    cold: '고정 장치가 잠겼고 엔진은 정지 상태다. 준비되면 출격을 승인하라.',
    bridge: '브리핑 중에는 추력을 차단했다. 함교에서 승인하면 추격을 재개한다.',
    squid: '촉수 공격 경로를 피하고 분열한 거품을 하나씩 처리하라.',
    snake: '독성 탄막을 확인하고 휩쓸기 전에 빈 통로를 지나가라.',
    final: '빔 경고를 먼저 읽고 다음 휩쓸기를 피할 통로를 확보하라.',
    devil: 'DG 세포 신호를 확인했다. 돌진 방향이 정해진 뒤 회피하고 빔 공격을 피할 통로를 남겨라.',
    super: '중항모는 부채꼴 일제 사격과 방사형 탄막을 사용한다. 일제 사격이 지나간 뒤 탄막 사이를 통과하라.',
  },
} as const

export function getCarrierSectorIntel(language: LanguageCode, mode: RaidMode, stage: number, recoveryBoss?: BossKind, underway = false) {
  const words = copy[language] ?? copy.en
  const text = getRaidText(language)
  const kind = recoveryBoss ?? (mode === 'endless' ? undefined : getCampaignBossKind(stage))
  const codexKey = kind === 'squid' || kind === 'snake' || kind === 'final' || kind === 'devil' ? bossCodex[kind] : undefined
  const target = codexKey ? getReleaseText(language).codexMap[codexKey].title : kind ? getGenericBossArt(kind, stage)?.name : undefined
  const arrival = mode === 'endless' || recoveryBoss === 'devil' ? undefined : cosmicArrival(stage, true).name
  const formation = (mode === 'campaign' && recoveryBoss !== 'devil') || (!recoveryBoss && mode === 'endless') ? text.hud.formationIntel[getRaidStageEncounter(stage).wings[0][0]] : undefined
  const tactics = kind === 'super' || kind === 'squid' || kind === 'snake' || kind === 'final' || kind === 'devil' ? words[kind] : undefined
  return {
    objective: target && recoveryBoss ? `${words.order} ${target}` : undefined,
    goals: recoveryBoss && target ? [arrival ?? 'Mesiah', formation ?? words.heading, target] : undefined,
    tacticalBeat: [
      words.tactical,
      target ?? words.heading,
      [tactics ?? (target ? `${words.orbit} ${target}.` : words.reserve), formation && (!recoveryBoss || !tactics) ? `${words.wing} · ${formation}.` : ''].filter(Boolean).join(' '),
    ] as const,
    recoveryBeat: [words.command, words.heading, target ? `${words.orbit} ${target}.` : words.reserve] as const,
    departureBeat: [words.deck, 'Mesiah', underway ? words.bridge : words.cold] as const,
  }
}
