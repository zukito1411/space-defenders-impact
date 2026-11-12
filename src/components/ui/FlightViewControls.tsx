import type { LanguageCode } from '../../i18n'

const COPY = {
  en: { title: 'Display & Raid flight', portrait: 'Portrait', landscape: 'Landscape', hint: 'Landscape uses side-view ships and horizontal flight. Turn your phone sideways if the display does not rotate automatically.' },
  zh: { title: '显示与突击视角', portrait: '竖屏', landscape: '横屏', hint: '横屏采用侧视战机与横向飞行。如果画面未自动旋转，请横置手机。' },
  ja: { title: '画面とレイド視点', portrait: '縦画面', landscape: '横画面', hint: '横画面では側面モデルで横方向に飛行します。自動で回転しない場合は端末を横にしてください。' },
  ko: { title: '화면 및 레이드 시점', portrait: '세로', landscape: '가로', hint: '가로 모드에서는 측면 기체로 수평 비행합니다. 화면이 자동으로 회전하지 않으면 휴대폰을 가로로 돌려 주세요.' },
}

export function FlightViewControls({ language, landscape, onChange }: { language: LanguageCode; landscape: boolean; onChange: (landscape: boolean) => void }) {
  const copy = COPY[language]
  return (
    <div className="raid__settings-section">
      <span className="raid__settings-heading">{copy.title}</span>
      <div className="raid__gfx-row raid__gfx-row--settings" role="group" aria-label={copy.title}>
        <button type="button" className={`raid__gfx-btn${!landscape ? ' raid__gfx-btn--active' : ''}`} aria-pressed={!landscape} onClick={() => onChange(false)}>{copy.portrait}</button>
        <button type="button" className={`raid__gfx-btn${landscape ? ' raid__gfx-btn--active' : ''}`} aria-pressed={landscape} onClick={() => onChange(true)}>{copy.landscape}</button>
      </div>
      <p className="raid__flight-view-hint">{copy.hint}</p>
    </div>
  )
}
