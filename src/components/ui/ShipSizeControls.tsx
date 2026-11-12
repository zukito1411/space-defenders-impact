import type { LanguageCode } from '../../i18n'
import { setRaidShipSize, useRaidShipSize } from '../games/raid/shipSize'

const COPY = {
  en: { title: 'Player ship size', warning: 'Larger ships have larger hitboxes and are easier to hit. Scouts change visually only.' },
  ja: { title: '自機サイズ', warning: '機体を大きくすると当たり判定も大きくなります。護衛機は見た目だけが変わります。' },
  ko: { title: '플레이어 기체 크기', warning: '기체가 커지면 피격 판정도 커집니다. 정찰기는 외형만 변경됩니다.' },
  zh: { title: '玩家飞船大小', warning: '飞船越大，碰撞判定也越大。僚机仅改变外观。' },
}
export function ShipSizeControls({ language }: { language: LanguageCode }) {
  const value = useRaidShipSize()
  const text = COPY[language] ?? COPY.en
  return (
    <div className="raid__settings-section raid__ship-size">
      <label className="raid__volume-control">
        <span>{text.title}</span>
        <input type="range" min="100" max="150" step="5" value={Math.round(value * 100)}
          onChange={event => setRaidShipSize(Number(event.currentTarget.value) / 100)} />
        <b>{Math.round(value * 100)}%</b>
      </label>
      <p className="raid__ship-size-warning">{text.warning}</p>
    </div>
  )
}
