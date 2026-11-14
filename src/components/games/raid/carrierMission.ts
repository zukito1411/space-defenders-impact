import type { LanguageCode } from '../../../i18n'
import type { RaidMode } from './types'
import { CAMPAIGN_COMMS_UI } from './campaignComms'

const COPY = {
  en: {
    approach: 'MESIAH · FINAL APPROACH', bridgeHold: 'BRIDGE · ENGINES COLD',
    boarding: 'PILOT BOARDING', clearing: 'FLIGHT DECK · CLEARING',
    underway: 'IN FLIGHT', engaged: 'ON COURSE · WEAPONS LIVE',
    channel: 'CARRIER COMMAND', secure: 'SECURE UPLINK', docked: 'FLIGHT DECK · DOCKED',
    next: 'Continue transmission', launch: 'Authorize launch', skip: 'Launch now', back: 'Return to hangar', standby: 'Awaiting squadron lead',
    ignition: 'ENGINE IGNITION', depart: 'CLAMPS RELEASED · DEPARTING', clear: 'BAY CLEAR · WEAPONS LIVE',
    campaign: {
      objective: 'Pursue the joint fleet',
      goals: ['Break through the next sector', 'Track the lead formation', 'Destroy its command ship'],
    },
    endless: {
      operation: 'LAST LIGHT', objective: 'Cover the evacuation',
      goals: ['Protect the transports', 'Hold the corridor', 'Stay in contact with Mesiah'],
    },
    bossRush: {
      operation: 'SPEARPOINT', objective: 'Intercept the command ships',
      goals: ['Hunt the command vessels', 'Break each attack pattern', 'Finish the flagship'],
    },
  },
  zh: {
    approach: 'MESIAH · 最后进近', bridgeHold: '舰桥 · 引擎关闭',
    boarding: '驾驶员登机', clearing: '飞行甲板 · 清场',
    underway: '航行中', engaged: '航向确认 · 武器上线',
    channel: '航母指挥部', secure: '加密通讯', docked: '飞行甲板 · 已停靠', next: '继续通讯', launch: '批准出击', skip: '立即出击', back: '返回机库', standby: '等待队长命令', ignition: '引擎点火', depart: '锁具释放 · 正在出击', clear: '已离舰 · 武器上线',
    campaign: { objective: '追击联合舰队', goals: ['突破下一个星域', '跟踪先头编队', '摧毁指挥舰'] },
    endless: { operation: '最后的曙光', objective: '守住航道，让舰队生还。', goals: ['抵御无尽攻势', '强化你的武装', '突破最高纪录'] },
    bossRush: { operation: '矛尖', objective: '三个指挥信号，一次决定性打击。', goals: ['猎杀指挥舰', '突破攻击阵型', '击沉旗舰'] },
  },
  ja: {
    approach: 'MESIAH · 最終進入', bridgeHold: '艦橋 · エンジン停止',
    boarding: 'パイロット搭乗中', clearing: '飛行甲板 · 退避中',
    underway: '航行中', engaged: '進路確認 · 武装作動',
    channel: '母艦司令部', secure: '暗号通信', docked: '飛行甲板 · 係留中', next: '通信を続ける', launch: '発進を承認', skip: '直ちに発進', back: '格納庫へ戻る', standby: '隊長の命令待ち', ignition: 'エンジン点火', depart: '拘束解除 · 発進中', clear: '母艦離脱 · 武装作動',
    campaign: { objective: '連合艦隊を追え', goals: ['次の宙域を突破', '先頭の編隊を追跡', '指揮艦を撃破'] },
    endless: { operation: 'ラストライト', objective: '航路を守り、艦隊を生還させろ。', goals: ['猛攻を生き延びる', '武装を強化', '記録を更新'] },
    bossRush: { operation: 'スピアポイント', objective: '三つの指揮信号。一撃で戦局を変えろ。', goals: ['指揮艦を追撃', '攻撃パターンを突破', '旗艦を撃破'] },
  },
  ko: {
    approach: 'MESIAH · 최종 접근', bridgeHold: '함교 · 엔진 정지',
    boarding: '파일럿 탑승 중', clearing: '비행 갑판 · 대피 중',
    underway: '항해 중', engaged: '항로 확인 · 무장 가동',
    channel: '모함 사령부', secure: '보안 통신', docked: '비행 갑판 · 정박 중', next: '통신 계속', launch: '출격 승인', skip: '즉시 출격', back: '격납고로 복귀', standby: '편대장 명령 대기', ignition: '엔진 점화', depart: '고정 장치 해제 · 출격', clear: '모함 이탈 · 무장 가동',
    campaign: { objective: '연합 함대를 추격하라', goals: ['다음 구역 돌파', '선두 편대 추적', '지휘함 격파'] },
    endless: { operation: '라스트 라이트', objective: '항로를 지키고 함대를 살려라.', goals: ['끝없는 공세에서 생존', '무장 강화', '최고 기록 경신'] },
    bossRush: { operation: '스피어포인트', objective: '지휘 신호 셋. 승부를 가를 일격.', goals: ['지휘함 추격', '공격 패턴 돌파', '기함 격파'] },
  },
} as const

export function getCarrierMission(language: LanguageCode, mode: RaidMode) {
  const copy = COPY[language] ?? COPY.en
  return mode === 'campaign' ? { ...copy, ...copy.campaign, operation: CAMPAIGN_COMMS_UI[language].operation } : { ...copy, ...copy[mode] }
}
