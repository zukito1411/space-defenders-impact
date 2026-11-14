import type { LanguageCode } from '../../../i18n'
import { getPublicAssetUrl } from '../sound'
import type { BossKind, RaidMode } from './types'
import { getCampaignTransmission, type CommsLine } from './campaignComms'

export const HOSTILE_HOLOGRAM_URL = getPublicAssetUrl('assets/ui/mesiah-hostile-hologram-v1.webp')
export const GENERAL_HOLOGRAM_URL = getPublicAssetUrl('assets/ui/cfoc-general-hologram-v1.webp')
export const COMMANDER_HOLOGRAM_URL = getPublicAssetUrl('assets/ui/mesiah-commander-hologram-v1.webp')

type Scene = readonly [situation: string, pilot: string, reply: string, launch: string]
type RecoveryBoss = 'squid' | 'snake' | 'final' | 'devil' | 'super'
type Scenes = Record<Exclude<RaidMode, 'campaign'> | RecoveryBoss | 'checkpoint', Scene>

const scenes: Record<LanguageCode, Scenes> = {
  en: {
    endless: ['Pilot, another wave is on its way. The last transports are still loading.', 'How much time do they need?', 'As much as you can give them. Stay between the attackers and the transports. We’ll call you back when the last one clears.', 'Deck, clear the bay. Pilot, you’re up.'],
    bossRush: ['Pilot, we’ve found all three enemy command ships. We can reach the first one before the others close in.', 'Which one do you want me to hit first?', 'The one on your scope. Take it down and I’ll give you the next heading.', 'You’re clear to launch. Call me when you have eyes on it.'],
    checkpoint: ['Welcome back, pilot. We’ve picked up the next enemy formation ahead of our position.', 'Do I go straight through them?', 'Yes. Clear a lane and stay on this channel. I’ll call out the command ship as soon as we have it.', 'Deck, release the clamps. Pilot, you’re clear to go.'],
    squid: ['Good to have you back. One of our scouts went down over Pelagic. We picked up a distress call, then something hit the relay buoy.', 'Did anyone get out?', 'The pilot did. I cut the buoy after he gave you his position. You’re welcome to come get him.', 'That came from the Squid’s position. Stay low and pull it off the beacon. I’ll send rescue in behind you.'],
    snake: ['The evac convoy made it as far as Cinder. There’s a Guardian sitting across the exit, and the transport crews are asking whether to run for it.', 'Tell them to hold. How close is it?', 'Close enough to hear you say that. Tell their crews they have two minutes to turn around.', 'Convoy, stay put. Pilot, get between them and that thing. I’ll give the convoy the go-ahead once you’ve drawn it off.'],
    final: ['Pilot, the fortress just destroyed our lunar relay. Its main guns are coming around toward Earth.', 'Can you get Mesiah between the guns and Earth?', 'I heard that. If you put your carrier there, I’ll fire through it.', 'Helm, bring us across. Pilot, go for the gun emitters. If they start lighting up, get out of the beam.'],
    devil: ['Hold on. That distress call coming out of the wreck field is on our frequency. It sounds like one of ours.', 'Can you ask them for their call sign?', 'You don’t recognize me? I heard you ask Mesiah for clearance. I’ve been listening since you left the bay.', 'Comms, shut it out. Pilot, draw Devil Gundam away from the carrier. Wait for it to commit before you turn in.'],
    super: ['We’ve got a heavy carrier closing on the flight deck. There are still two of our fighters outside waiting to dock.', 'Can we take them in before it gets here?', 'I see both of them. Shut the bay now and I’ll let your carrier go.', 'Keep the bay open. Pilot, get its guns off our fighters. Once it’s looking at you, I can bring them in.'],
  },
  zh: {
    endless: ['飞行员，下一波敌军就要到了。最后几艘运输船还在登船。','他们还需要多久？','能撑多久就撑多久。挡在敌机和运输船之间，最后一艘离开后我会叫你回来。','甲板，清空航道。飞行员，轮到你了。'],
    bossRush: ['飞行员，三艘敌方指挥舰都找到了。我们能在另外两艘赶到前拦住第一艘。','先打哪一艘？','先打雷达上那艘。击沉它以后，我给你下一个航向。','可以出击。看到它就告诉我。'],
    checkpoint: ['欢迎回来，飞行员。前方发现了下一支敌方编队。','直接从他们中间打过去？','对，打开一条航道，保持联络。找到指挥舰就告诉你。','甲板，松开锁具。飞行员，可以出击。'],
    squid: ['回来就好。我们有架侦察机坠入佩拉吉克。刚收到求救信号，中继浮标就被打掉了。','有人弹射出来了吗？','飞行员还活着。他把位置告诉你们之后，我切断了浮标。你们可以来找他。','信号来自巨鱿的位置。低空飞，把它从信标旁引开。救援队跟在你后面。'],
    snake: ['撤离船队到了辛德。守卫堵着出口，运输船在问要不要冲过去。','让他们等一下。敌人离多远？','近到能听到这句话。告诉他们，两分钟之内掉头。','船队原地待命。飞行员，插到他们中间。你把它引开，我就让船队通过。'],
    final: ['飞行员，要塞刚打掉了月球中继站。主炮正在转向地球。','Mesiah 能挡在主炮和地球之间吗？','我听见了。你把航母开过来，我就连它一起打穿。','舵手，横过来。飞行员，打它的发射器。看到炮口亮起就离开射线。'],
    devil: ['等等。残骸里那个求救信号用的是我们的频率。听起来像自己人。','能问一下他的呼号吗？','没认出我？你向 Mesiah 请求离舰，我从那时候就在听。','通讯，切断信号。飞行员，把恶魔高达引离母舰。等它冲过来再转回去。'],
    super: ['一艘重型航母正在逼近飞行甲板。我们还有两架战机在外面等着回舰。','能在它到之前把战机接进来吗？','两架我都看见了。现在关上舱门，我就放过你们的航母。','舱门保持开启。飞行员，把炮火从战机身上引开。我来接他们。'],
  },
  ja: {
    endless: ['パイロット、次が来る。最後の輸送船はまだ人を乗せている。','あと何分必要ですか？','稼げるだけ頼む。敵と輸送船の間に入れ。最後の船が抜けたら呼び戻す。','甲板を空けろ。パイロット、出番だ。'],
    bossRush: ['パイロット、指揮艦三隻を捕捉した。残りが合流する前に先頭に届く。','どれから沈めますか？','レーダーに映っている艦だ。沈めたら次の方角を知らせる。','発進していいぞ。目視したら連絡を。'],
    checkpoint: ['おかえり、パイロット。前方に次の敵編隊を捕捉した。','正面から抜けますか？','そうだ。航路を開いて通信は切るな。指揮艦を見つけたら知らせる。','甲板、クランプ解除。発進していいぞ。'],
    squid: ['無事だったか。ペラジック上空で偵察機が墜ちた。救難信号の直後に中継ブイがやられた。','脱出できたんですか？','できたさ。位置を伝え終わってからブイを切った。迎えに来ればいい。','イカの位置からだ。低く飛んでビーコンから引き離せ。後ろから救助隊を出す。'],
    snake: ['避難船団はシンダーまで着いた。出口にガーディアンがいる。船団が強行突破の許可を求めている。','待たせてください。敵との距離は？','その声が聞こえる距離だ。船団に二分で引き返せと伝えろ。','船団は待機。パイロット、間に入れ。君が引きつけたら船を通す。'],
    final: ['パイロット、要塞が月の中継局を壊した。主砲を地球に向けている。','Mesiah を射線に入れられますか？','聞こえたぞ。空母を出すなら、まとめて撃ち抜く。','操舵、射線に入れ。パイロット、発射器を狙え。光ったらすぐ射線から離れろ。'],
    devil: ['待て。残骸からの救難信号、うちの周波数だ。声も味方に聞こえる。','コールサインを聞けますか？','わからないか？ Mesiah に発進許可を求めていたな。あれからずっと聞いていた。','通信を切れ。パイロット、デビルガンダムを母艦から離せ。突っ込んできたら反転だ。'],
    super: ['重空母が飛行甲板に迫っている。まだ二機が外で着艦を待っている。','敵が来る前に収容できますか？','二機とも見えている。今すぐ格納庫を閉めれば、母艦は見逃してやる。','格納庫は開けておけ。パイロット、砲火を引きつけろ。その間に二機を収容する。'],
  },
  ko: {
    endless: ['파일럿, 다음 편대가 오고 있다. 마지막 수송선에 아직 사람들이 타고 있어.','얼마나 더 필요합니까?','벌어 줄 수 있는 만큼. 적과 수송선 사이를 막아 줘. 마지막 배가 빠지면 부르겠다.','갑판 비워. 파일럿, 네 차례야.'],
    bossRush: ['파일럿, 적 지휘함 세 척을 찾았다. 나머지가 합류하기 전에 첫 함선에 닿을 수 있어.','어느 쪽부터 칠까요?','레이더에 잡힌 함선. 격침시키면 다음 방향을 알려 줄게.','출격해도 된다. 직접 보이면 연락해.'],
    checkpoint: ['돌아왔군, 파일럿. 전방에서 다음 적 편대를 잡았다.','정면으로 뚫습니까?','그래. 길을 열고 통신은 유지해. 지휘함을 찾으면 바로 알려 줄게.','갑판, 고정 장치 풀어. 출격해도 된다.'],
    squid: ['무사히 왔군. 펠라직 상공에서 정찰기 한 대가 떨어졌다. 구조 신호 직후 중계 부표가 끊겼어.','탈출했습니까?','살아 있어. 위치를 알려 준 다음에 내가 부표를 껐지. 구하러 와도 좋아.','오징어가 있는 곳에서 온 신호야. 낮게 가서 신호기에서 떼어 놔. 뒤에 구조대를 보낼게.'],
    snake: ['대피 선단이 신더까지 갔다. 가디언이 출구를 막고 있어. 수송선들이 돌파해도 되냐고 묻는다.','기다리라고 하세요. 적이 얼마나 가깝죠?','그 말이 들릴 만큼. 선단에 2분 안에 돌아가라고 해.','선단은 대기. 파일럿, 사이에 들어가. 네가 끌어내면 배들을 통과시킬게.'],
    final: ['파일럿, 요새가 달 중계소를 날려 버렸다. 주포가 지구 쪽으로 돌아가고 있어.','Mesiah를 사선에 넣을 수 있습니까?','들었다. 항모를 거기에 세우면 같이 뚫어 버리겠다.','조타, 사선으로 들어가. 파일럿, 발사기를 노려. 빛이 나면 빔 경로에서 벗어나.'],
    devil: ['잠깐. 잔해에서 들리는 구조 신호, 우리 주파수다. 목소리도 아군 같아.','호출 부호를 물어볼까요?','나를 모르겠나? Mesiah에 출격 허가를 요청했지. 그때부터 듣고 있었다.','통신 끊어. 파일럿, 데빌 건담을 모함에서 떼어 놔. 놈이 돌진하면 돌아서.'],
    super: ['중항모가 비행 갑판으로 다가온다. 아직 전투기 두 대가 밖에서 착함 대기 중이야.','적이 오기 전에 수용할 수 있습니까?','두 대 다 보인다. 지금 격납고를 닫으면 모함은 보내 주지.','격납고는 열어 둬. 파일럿, 함포를 네 쪽으로 돌려. 그 사이에 둘을 받아들인다.'],
  },
}

export const COMMS_COPY = {
  en: { commander: 'Mesiah Commander', pilot: 'Pilot', enemy: 'Unidentified contact', override: 'Channel interrupted', bridge: 'Pilot, take the bridge. We’re moving out.' },
  zh: { commander: 'Mesiah 舰长', pilot: '飞行员', enemy: '未知信号', override: '通讯中断', bridge: '飞行员，到舰桥来。我们出发。' },
  ja: { commander: 'Mesiah 艦長', pilot: 'パイロット', enemy: '不明な通信', override: '通信割り込み', bridge: 'パイロット、艦橋へ。出るぞ。' },
  ko: { commander: 'Mesiah 함장', pilot: '파일럿', enemy: '미확인 통신', override: '회선 차단', bridge: '파일럿, 함교로. 출발한다.' },
} as const

type Interruption = {
  first: readonly [pilot: string, commander: string]
  again: readonly [pilot: string, commander: string]
  enemy: Record<RecoveryBoss, string>
  restored: string
}

const interruptions: Record<LanguageCode, Interruption> = {
  en: {
    first: ['Commander? Who is that? This is our private channel.', 'I don’t know. Comms, how did they get in? Can you cut the feed?'],
    again: ['That’s the same signal. Can they hear us again?', 'Assume they can. Comms, switch the convoy to our backup frequency.'],
    enemy: {
      squid: 'I can stop talking if you like. The scout is still out there. I’ll shoot down any rescue ship that goes near him.',
      snake: 'Go ahead and switch frequencies. I can see the lead transport from here. If it moves, I fire.',
      final: 'You’ve got time to pull your carrier out of the way. Give the order now and your crew goes home.',
      devil: 'Ask them to cut it again. They’ve tried twice already. I was on your channel before you heard the distress call.',
      super: 'One of those fighters is leaking fuel. You can’t leave them out there much longer. What’s it going to be?',
    },
    restored: 'Pilot, can you hear me? We’re on the backup channel now.',
  },
  zh: {
    first: ['舰长？那是谁？这是我们的专用频道。','我也不知道。通讯，他们怎么进来的？能切断画面吗？'],
    again: ['又是那个信号。他们还能听见我们吗？','先按他们听得见处理。通讯，让船队换到备用频率。'],
    enemy: {
      squid: '不想听我说话也行。侦察兵还在外面，哪艘救援船敢靠近，我就打下来。',
      snake: '换频率吧。我在这儿看得见领头的运输船。它一动，我就开火。',
      final: '你的航母还来得及让开。现在下令，你的船员就能回家。',
      devil: '再让他们切一次试试。他们已经试过两次了。你听到求救信号之前，我就在你们的频道里。',
      super: '有架战机在漏油。你不能让他们在外面等太久。想好了吗？',
    },
    restored: '飞行员，听得见吗？我们已经换到备用频道了。',
  },
  ja: {
    first: ['艦長？ 誰ですか、今の。ここは専用回線ですよね。','わからん。通信、どうやって入られた？ 映像を切れるか？'],
    again: ['またあの信号です。こっちの声も聞こえてますか？','聞こえていると思え。通信、船団を予備周波数に切り替えろ。'],
    enemy: {
      squid: '話はもういいか。偵察兵はまだ外にいる。近づく救助船は撃ち落とす。',
      snake: '周波数を変えればいい。先頭の輸送船はここから見えている。動けば撃つ。',
      final: '母艦をどける時間はまだある。今すぐ命令すれば、乗員は帰れるぞ。',
      devil: 'もう一度切らせてみろ。すでに二度試したようだがな。救難信号が聞こえる前から、この回線にいた。',
      super: '一機から燃料が漏れている。もう長くは待たせられないぞ。どうする？',
    },
    restored: 'パイロット、聞こえるか？ 予備回線に切り替えた。',
  },
  ko: {
    first: ['함장님? 저게 누구죠? 우리 전용 채널인데요.','나도 모르겠다. 통신, 어떻게 들어온 거야? 화면 끊을 수 있어?'],
    again: ['또 그 신호입니다. 우리 말도 들을 수 있는 건가요?','들린다고 생각해. 통신, 선단을 예비 주파수로 옮겨.'],
    enemy: {
      squid: '말은 그만하지. 정찰병은 아직 밖에 있어. 가까이 오는 구조선은 격추하겠다.',
      snake: '주파수나 바꿔 봐. 선두 수송선은 여기서 보여. 움직이면 쏜다.',
      final: '아직 모함을 피할 시간은 있어. 지금 명령하면 승무원들은 돌아갈 수 있다.',
      devil: '한 번 더 끊으라고 해 봐. 벌써 두 번이나 시도했지. 구조 신호를 듣기 전부터 이 채널에 있었다.',
      super: '전투기 한 대에서 연료가 새고 있어. 저 밖에 오래 둘 수 없을 텐데. 어떻게 할 거지?',
    },
    restored: '파일럿, 들리나? 예비 채널로 옮겼다.',
  },
}

export function getCarrierConversation(language: LanguageCode, mode: RaidMode, stage: number,
  underway: boolean, boss?: BossKind, firstInterception = true, debrief = false): readonly CommsLine[] {
  if (mode === 'campaign') {
    const transmission = getCampaignTransmission(language, stage, debrief)
    if (transmission) return transmission
  }
  const scene = boss ? boss === 'squid' || boss === 'snake' || boss === 'final' || boss === 'devil' ? boss : 'super'
    : mode === 'campaign' ? 'checkpoint' : mode
  const [situation, pilot, reply, launch] = scenes[language][scene]
  const departure = underway ? (boss ? `${launch} ${COMMS_COPY[language].bridge}` : COMMS_COPY[language].bridge) : launch
  if (scene === 'endless' || scene === 'bossRush' || scene === 'checkpoint') {
    return [['commander', situation], ['pilot', pilot], ['commander', reply], ['commander', departure]]
  }
  const interruption = interruptions[language]
  const [pilotReaction, commanderReaction] = firstInterception ? interruption.first : interruption.again
  return [
    ['commander', situation],
    ['pilot', pilot],
    ['enemy', reply, 'enemy'],
    ['pilot', pilotReaction, 'enemy'],
    ['commander', commanderReaction, 'enemy'],
    ['enemy', interruption.enemy[scene], 'enemy'],
    ['commander', interruption.restored],
    ['commander', departure],
  ]
}
