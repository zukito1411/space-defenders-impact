import type { LanguageCode } from '../../i18n'

const LABELS = {
  en: { navigate: 'Navigate', select: 'Select', back: 'Back' },
  zh: { navigate: '选择', select: '确认', back: '返回' },
  ja: { navigate: '移動', select: '決定', back: '戻る' },
  ko: { navigate: '이동', select: '선택', back: '뒤로' },
}

export function GameMenuHints({ language, showBack = true }: { language: LanguageCode; showBack?: boolean }) {
  const text = LABELS[language]
  return (
    <div className="game-menu-hints">
      <span><kbd>↑ ↓</kbd>{text.navigate}</span>
      <span><kbd>↵</kbd>{text.select}</span>
      {showBack && <span><kbd>Esc</kbd>{text.back}</span>}
    </div>
  )
}
