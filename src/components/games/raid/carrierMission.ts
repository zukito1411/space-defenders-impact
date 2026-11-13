import type { LanguageCode } from '../../../i18n'
import type { RaidMode } from './types'

const COPY = {
  en: {
    approach: 'MESIAH · FINAL APPROACH', bridgeHold: 'BRIDGE · ENGINES COLD',
    boarding: 'PILOT BOARDING', clearing: 'FLIGHT DECK · CLEARING',
    underway: 'IN FLIGHT', engaged: 'ON COURSE · WEAPONS LIVE', underwayBeat: ['Bridge', 'You are cleared to engage.', 'Mesiah is on course. Take the helm and bring the fleet through, Commander.'],
    channel: 'CARRIER COMMAND', secure: 'SECURE UPLINK', docked: 'FLIGHT DECK · DOCKED',
    next: 'Continue transmission', launch: 'Authorize launch', skip: 'Launch now', back: 'Return to hangar', standby: 'Awaiting squadron lead',
    ignition: 'ENGINE IGNITION', depart: 'CLAMPS RELEASED · DEPARTING', clear: 'BAY CLEAR · WEAPONS LIVE',
    campaign: {
      operation: 'EARTHWARD', objective: 'Break the blockade. Bring our sky back.',
      goals: ['Breach hostile sectors', 'Recover enemy armaments', 'Destroy the command fleet'],
      beats: [
        ['Command', 'The line is breaking.', 'Earth is behind us. The enemy fleet is ahead. This carrier can hold the corridor—but only you can open it.'],
        ['Tactical', 'Cut a path home.', 'Break through the hostile sectors. Claim their weapons. Bring down the command ships before they reach our defense line.'],
        ['Flight deck', 'You are cleared to launch.', 'Your ship is ready. We release the clamps on your mark. Make every shot count, Commander. Earth is counting on you.'],
      ],
    },
    endless: {
      operation: 'LAST LIGHT', objective: 'Hold the corridor. Keep the fleet alive.',
      goals: ['Survive the onslaught', 'Build your arsenal', 'Push the record further'],
      beats: [
        ['Command', 'We are the last line.', 'More contacts are inbound. The evacuation fleet needs time. Every wave you break is another ship that makes it home.'],
        ['Tactical', 'Turn their strength against them.', 'Recover armaments from the wreckage. Keep moving, keep fighting. They have numbers. You have the better ship.'],
        ['Flight deck', 'Give them something to fear.', 'Engines are standing by. The launch lane is yours. Hold that corridor for as long as you can, Commander.'],
      ],
    },
    bossRush: {
      operation: 'SPEARPOINT', objective: 'Three command signatures. One decisive strike.',
      goals: ['Hunt the command vessels', 'Break each attack pattern', 'Finish the flagship'],
      beats: [
        ['Command', 'Cut off the head.', 'We have isolated the enemy command signatures. This is our opening. Destroy their leaders and the fleet loses its grip.'],
        ['Tactical', 'Three battles. No retreat.', 'Your arsenal is combat-ready. Read their attack lanes, strike through their openings, and save your heavy weapons for the kill.'],
        ['Flight deck', 'Spearpoint is go.', 'Launch lane clear. Full power is yours, Commander. Bring those command ships down.'],
      ],
    },
  },
  zh: {
    approach: 'MESIAH · 最后进近', bridgeHold: '舰桥 · 引擎关闭',
    boarding: '驾驶员登机', clearing: '飞行甲板 · 清场',
    underway: '航行中', engaged: '航向确认 · 武器上线', underwayBeat: ['舰桥', '批准交战。', 'Mesiah 已进入预定航线。指挥官，请接管舰船，带领舰队突围。'],
    channel: '航母指挥部', secure: '加密通讯', docked: '飞行甲板 · 已停靠', next: '继续通讯', launch: '批准出击', skip: '立即出击', back: '返回机库', standby: '等待队长命令', ignition: '引擎点火', depart: '锁具释放 · 正在出击', clear: '已离舰 · 武器上线',
    campaign: { operation: '重返地球', objective: '突破封锁，夺回我们的天空。', goals: ['突破敌方星域', '回收敌军武装', '摧毁指挥舰队'], beats: [['指挥部', '防线正在崩溃。', '地球就在身后，敌舰就在前方。航母会守住这条航道，但只有你能打通它。'], ['战术官', '杀出一条归途。', '突破敌方星域，夺取他们的武器。在敌军指挥舰抵达地球防线前，将它们击沉。'], ['飞行甲板', '批准出击。', '座舰已就绪。只等你的命令，我们就松开锁具。每一发炮火都至关重要，指挥官。地球在等你。']] },
    endless: { operation: '最后的曙光', objective: '守住航道，让舰队生还。', goals: ['抵御无尽攻势', '强化你的武装', '突破最高纪录'], beats: [['指挥部', '我们是最后一道防线。', '更多敌军正在逼近。撤离舰队需要时间。你每挡下一波，就能让更多人回家。'], ['战术官', '以敌之力，反击敌军。', '从残骸中回收武装。保持机动，持续作战。他们有数量，你有更强的座舰。'], ['飞行甲板', '让他们知道恐惧。', '引擎待命，出击航道属于你。指挥官，尽可能久地守住那里。']] },
    bossRush: { operation: '矛尖', objective: '三个指挥信号，一次决定性打击。', goals: ['猎杀指挥舰', '突破攻击阵型', '击沉旗舰'], beats: [['指挥部', '斩断敌军首脑。', '敌方指挥信号已锁定。这就是机会。消灭它们，敌军舰队就会失去控制。'], ['战术官', '三场决战，无路可退。', '武装已就绪。看清攻击航道，抓住破绽，把重火力留给致命一击。'], ['飞行甲板', '矛尖行动，开始。', '航道已清空，全功率交给你。指挥官，击沉那些指挥舰。']] },
  },
  ja: {
    approach: 'MESIAH · 最終進入', bridgeHold: '艦橋 · エンジン停止',
    boarding: 'パイロット搭乗中', clearing: '飛行甲板 · 退避中',
    underway: '航行中', engaged: '進路確認 · 武装作動', underwayBeat: ['艦橋', '交戦を許可する。', 'Mesiah は進路に入った。操艦を引き継ぎ、艦隊を突破させろ、司令官。'],
    channel: '母艦司令部', secure: '暗号通信', docked: '飛行甲板 · 係留中', next: '通信を続ける', launch: '発進を承認', skip: '直ちに発進', back: '格納庫へ戻る', standby: '隊長の命令待ち', ignition: 'エンジン点火', depart: '拘束解除 · 発進中', clear: '母艦離脱 · 武装作動',
    campaign: { operation: 'アースワード', objective: '封鎖を突破し、空を取り戻せ。', goals: ['敵宙域を突破', '敵の武装を回収', '指揮艦隊を撃破'], beats: [['司令部', '防衛線が崩れ始めている。', '背後には地球、前方には敵艦隊。この母艦は航路を守る。だが、道を開けるのは君だけだ。'], ['戦術管制', '帰還の道を切り開け。', '敵宙域を突破し、武装を奪え。指揮艦が地球の防衛線へ到達する前に撃沈するんだ。'], ['飛行甲板', '発進を許可する。', '機体の準備は完了。君の合図で拘束を解除する。一発も無駄にするな、司令官。地球が待っている。']] },
    endless: { operation: 'ラストライト', objective: '航路を守り、艦隊を生還させろ。', goals: ['猛攻を生き延びる', '武装を強化', '記録を更新'], beats: [['司令部', '我々が最後の防衛線だ。', '新たな敵影を確認。避難艦隊には時間が必要だ。一波を退けるたびに、帰れる艦が増える。'], ['戦術管制', '敵の力を奪い取れ。', '残骸から武装を回収し、動き続けろ。敵には数がある。君には最高の機体がある。'], ['飛行甲板', '敵に恐怖を教えてやれ。', 'エンジン待機。発進航路は君のものだ。司令官、可能な限り持ちこたえてくれ。']] },
    bossRush: { operation: 'スピアポイント', objective: '三つの指揮信号。一撃で戦局を変えろ。', goals: ['指揮艦を追撃', '攻撃パターンを突破', '旗艦を撃破'], beats: [['司令部', '敵の頭を断て。', '指揮艦の信号を捉えた。今が好機だ。司令官を倒せば、敵艦隊の支配は崩れる。'], ['戦術管制', '三つの決戦。退路はない。', '武装は戦闘準備完了。攻撃航路を読み、隙を突け。重火器はとどめのために取っておけ。'], ['飛行甲板', 'スピアポイント、出撃。', '発進航路クリア。全出力を託す。司令官、指揮艦を沈めてこい。']] },
  },
  ko: {
    approach: 'MESIAH · 최종 접근', bridgeHold: '함교 · 엔진 정지',
    boarding: '파일럿 탑승 중', clearing: '비행 갑판 · 대피 중',
    underway: '항해 중', engaged: '항로 확인 · 무장 가동', underwayBeat: ['함교', '교전을 허가한다.', 'Mesiah가 항로에 진입했다. 지휘관, 조타를 맡아 함대를 이끌어라.'],
    channel: '모함 사령부', secure: '보안 통신', docked: '비행 갑판 · 정박 중', next: '통신 계속', launch: '출격 승인', skip: '즉시 출격', back: '격납고로 복귀', standby: '편대장 명령 대기', ignition: '엔진 점화', depart: '고정 장치 해제 · 출격', clear: '모함 이탈 · 무장 가동',
    campaign: { operation: '어스워드', objective: '봉쇄를 뚫고 우리의 하늘을 되찾아라.', goals: ['적 섹터 돌파', '적 무장 회수', '지휘 함대 격파'], beats: [['사령부', '방어선이 무너지고 있다.', '뒤에는 지구가, 앞에는 적 함대가 있다. 모함은 항로를 지킨다. 하지만 길을 열 수 있는 건 너뿐이다.'], ['전술 관제', '귀환할 길을 열어라.', '적 섹터를 돌파하고 무장을 빼앗아라. 적 지휘함이 지구 방어선에 닿기 전에 격침시켜라.'], ['비행 갑판', '출격을 허가한다.', '기체 준비 완료. 신호만 주면 고정을 해제한다. 한 발도 낭비하지 마라, 사령관. 지구가 널 기다린다.']] },
    endless: { operation: '라스트 라이트', objective: '항로를 지키고 함대를 살려라.', goals: ['끝없는 공세에서 생존', '무장 강화', '최고 기록 경신'], beats: [['사령부', '우리가 마지막 방어선이다.', '추가 적기 접근 중. 피난 함대에는 시간이 필요하다. 한 파도를 막을 때마다 더 많은 함선이 집으로 돌아간다.'], ['전술 관제', '적의 힘을 빼앗아라.', '잔해에서 무장을 회수하고 계속 움직여라. 적에게는 수가 있다. 너에게는 더 나은 기체가 있다.'], ['비행 갑판', '두려움을 가르쳐 줘라.', '엔진 대기 완료. 출격 항로는 네 것이다. 사령관, 할 수 있는 한 오래 버텨라.']] },
    bossRush: { operation: '스피어포인트', objective: '지휘 신호 셋. 승부를 가를 일격.', goals: ['지휘함 추격', '공격 패턴 돌파', '기함 격파'], beats: [['사령부', '적의 머리를 잘라라.', '적 지휘 신호를 포착했다. 지금이 기회다. 지휘관을 쓰러뜨리면 적 함대의 통제도 무너진다.'], ['전술 관제', '세 번의 결전. 퇴로는 없다.', '무장 준비 완료. 공격 항로를 읽고 빈틈을 노려라. 중화기는 마지막 일격을 위해 남겨 둬라.'], ['비행 갑판', '스피어포인트, 출격.', '항로 확보. 최대 출력을 맡긴다. 사령관, 저 지휘함들을 가라앉혀라.']] },
  },
} as const

export function getCarrierMission(language: LanguageCode, mode: RaidMode) {
  const copy = COPY[language] ?? COPY.en
  return { ...copy, ...copy[mode] }
}
