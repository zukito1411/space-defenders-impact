import type { LanguageCode } from '../../../i18n'
import { getPublicAssetUrl } from '../sound'
import type { BossKind } from './types'

type Exchange = readonly [contact: string, order: string, threat: string, reply: string]
type RecoveryBoss = 'squid' | 'snake' | 'final' | 'devil' | 'super'
export const HOSTILE_HOLOGRAM_URL = getPublicAssetUrl('assets/ui/mesiah-hostile-hologram-v1.webp')

const exchanges: Record<LanguageCode, Record<RecoveryBoss, Exchange>> = {
  en: {
    squid: ['Pilot, we lost a scout under the cloud deck. The Abyss Squid is still down there.',
      'Take us below the clouds. Draw its tendrils off the carrier. I’ll keep your way home open.',
      'Your scout called for Mesiah until the water took him. I wondered when you’d answer.',
      'Cut the channel. We’re going after our scout. Keep your comms open, pilot.'],
    snake: ['Cinder control has gone quiet. The Serpent Guardian is coiled around the evacuation route.',
      'Get between it and the convoy. Wait for the sweep to pass, then punch a hole through.',
      'I can see your convoy through the ash. Which ship should I start with?',
      'Convoy, hold behind us. Pilot, make it look at you. You’re clear to launch.'],
    final: ['That fortress is turning its batteries toward Earth. We just watched it burn through a moon relay.',
      'I need you in close before it takes the shot. The moment those emitters light up, break off.',
      'Your relay took eleven seconds. How long do you suppose the carrier will last?',
      'Helm, put Mesiah between the fortress and Earth. Pilot, take those guns away.'],
    devil: ['Pilot, we’ve picked up DG cells inside the wreck field. Something in there is answering our calls.',
      'Keep it clear of Mesiah. Let it commit to a charge before you turn back in.',
      'You keep flying back to that ship. I’ll remember where to find you.',
      'Close the bay behind you. I want that thing well away from this crew.'],
    super: ['That carrier has been shadowing us since the last jump. Now it’s cutting across our bow.',
      'Pull its guns away from our flight deck. Let its first volley go by, then go in.',
      'Mesiah, your distress calls carry quite far. It was kind of you to leave them on.',
      'Switch to tightbeam. Pilot, clear the approach so we can pull the rest of the wing aboard.'],
  },
  zh: {
    squid: ['飞行员，一艘侦察机在云层下失联了。深渊巨鱿还在下面。','下到云层底下，把它的触手引离母舰。归航通道我来守。','你的侦察兵一直在呼叫 Mesiah，直到海水淹没了他。我就想，你什么时候才会应答。','切断通讯。我们去找那艘侦察机。飞行员，保持联络。'],
    snake: ['熔岩区的管制台失联了。蛇形守卫盘踞在撤离航线上。','挡在它和运输队之间。等它扫过，再冲过去打开缺口。','隔着灰烬，我也看得见你们的运输队。你说，我该从哪艘下手？','运输队，跟在我们后面。飞行员，把它的注意力引到你身上。批准出击。'],
    final: ['那座要塞正把炮口转向地球。我们刚看着它摧毁了月面中继站。','在它开火前贴上去。看到发射器亮起就立刻脱离。','摧毁你们的中继站只用了十一秒。你猜母舰能撑多久？','舵手，把 Mesiah 开到要塞与地球之间。飞行员，打掉那些炮。'],
    devil: ['飞行员，残骸场里发现了 DG 细胞。有东西在回应我们的呼叫。','别让它靠近 Mesiah。等它冲过来，再回转反击。','你总是飞回那艘船。我会记住，到哪里去找你。','你一离舰就关舱门。把那东西引离我们的船员。'],
    super: ['那艘航母从上次跃迁就一直尾随我们。它现在正横切舰首。','把它的炮口引离飞行甲板。等第一轮齐射过去再攻进去。','Mesiah，你们的求救信号传得真远。多谢你们一直开着。','切换窄波束。飞行员，清空进场航道，让剩下的僚机回舰。'],
  },
  ja: {
    squid: ['パイロット、雲の下で偵察機を見失った。深淵のイカはまだそこにいる。','雲の下へ降りて、触手を母艦から引き離せ。帰り道はこちらで守る。','偵察兵は海に呑まれるまで Mesiah を呼んでいた。返事はまだかと思ってね。','回線を切れ。偵察機を捜しに行くぞ。パイロット、通信は開けておけ。'],
    snake: ['シンダーの管制局が沈黙した。サーペント・ガーディアンが避難航路を塞いでいる。','船団と奴の間に入れ。薙ぎ払いをやり過ごしてから突破するんだ。','灰の向こうに船団が見える。さて、どの船から始めようか。','船団は我々の後方へ。パイロット、奴を引きつけろ。発進を許可する。'],
    final: ['要塞の砲台が地球を向き始めた。ついさっき月の中継局を焼き切ったばかりだ。','撃たれる前に接近しろ。砲口が光ったらすぐに離脱だ。','中継局は十一秒もった。君たちの母艦は何秒もつかな。','操舵、Mesiah を地球と要塞の間に。パイロット、砲台を潰してくれ。'],
    devil: ['パイロット、残骸の中に DG 細胞の反応。何かがこちらの呼びかけに応えている。','Mesiah に近づけるな。奴が突進してから反転しろ。','君はいつもあの艦に帰る。どこを探せばいいか覚えておこう。','発進したらすぐに閉鎖しろ。奴を乗員に近づけるな。'],
    super: ['あの母艦、前の跳躍からついてきている。今度は艦首を横切る気だ。','奴の砲を飛行甲板からそらせ。最初の一斉射をかわしてから突っ込め。','Mesiah、救難信号はよく届いているよ。流し続けてくれて助かった。','指向性通信に切り替えろ。パイロット、残りの編隊を収容する進入路を確保してくれ。'],
  },
  ko: {
    squid: ['파일럿, 구름 아래에서 정찰기를 잃었다. 심연의 오징어는 아직 그 아래 있다.','구름 아래로 내려가 촉수를 모함에서 떼어 놔. 돌아오는 길은 내가 지킨다.','정찰병은 바닷물에 잠길 때까지 Mesiah를 불렀지. 언제 대답하나 궁금했다.','회선 끊어. 정찰기를 찾으러 간다. 파일럿, 통신은 열어 둬.'],
    snake: ['신더 관제소가 응답하지 않는다. 서펀트 가디언이 대피 항로를 막고 있다.','수송선단과 놈 사이에 들어가. 휩쓸기가 지나가면 틈을 뚫어.','잿더미 너머로 수송선이 보이는군. 어느 배부터 시작할까?','선단은 우리 뒤로. 파일럿, 놈의 시선을 끌어. 출격을 허가한다.'],
    final: ['요새가 포대를 지구 쪽으로 돌리고 있다. 방금 달의 중계소를 태워 버렸어.','쏘기 전에 접근해. 포구가 빛나는 순간 이탈한다.','중계소는 11초 버텼다. 너희 모함은 얼마나 버틸까?','조타, Mesiah를 지구와 요새 사이로. 파일럿, 저 포대들을 없애 줘.'],
    devil: ['파일럿, 잔해 지대 안에서 DG 세포가 잡혔다. 뭔가 우리 호출에 응답하고 있다.','놈을 Mesiah에서 멀리 떼어 놔. 돌진이 시작되면 돌아서 반격해.','넌 늘 그 함선으로 돌아가는군. 어디서 널 찾을지 기억해 두지.','출격하면 바로 격납고를 닫아. 저것을 우리 승무원에게 가까이 두지 마.'],
    super: ['저 항모가 지난 도약부터 따라붙었어. 이제 우리 뱃머리를 가로지른다.','놈의 포를 비행 갑판에서 돌려. 첫 일제 사격을 흘린 뒤 파고들어.','Mesiah, 구조 신호가 아주 멀리 들리는군. 계속 켜 둬서 고맙다.','지향성 통신으로 전환해. 파일럿, 나머지 편대가 돌아오도록 접근로를 열어 줘.'],
  },
}

const channels = {
  en: ['Mesiah Commander', 'Enemy transmission', 'Signal override', 'Pilot, take the bridge. We’re moving out.'],
  zh: ['Mesiah 舰长', '敌方通讯', '通讯遭劫持', '飞行员，到舰桥来。我们出发。'],
  ja: ['Mesiah 艦長', '敵からの通信', '回線乗っ取り', 'パイロット、艦橋へ。出るぞ。'],
  ko: ['Mesiah 함장', '적 통신', '회선 탈취', '파일럿, 함교로. 출발한다.'],
} as const

export function getHostileBriefing(language: LanguageCode, boss: BossKind, underway: boolean) {
  const kind = boss === 'squid' || boss === 'snake' || boss === 'final' || boss === 'devil' ? boss : 'super'
  const [commander, enemy, override, bridgeOrder] = channels[language]
  const [contact, order, threat, reply] = exchanges[language][kind]
  return {
    override,
    beats: [
      [commander, contact],
      [commander, order],
      [enemy, threat],
      [commander, underway ? `${reply} ${bridgeOrder}` : reply],
    ] as const,
  }
}
