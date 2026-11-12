import { useState } from 'react'
import { getRaidText, type LanguageCode } from '../i18n'
import { getGameAudioMixSettings, getGraphicsQuality, setGameAudioMixSettings, setGraphicsQuality, type AudioMixSettings, type GraphicsQuality } from './games/sound'
import { useRaidFlightView } from './games/raid/flightView'
import { GameDialog } from './ui/GameDialog'
import { GameButton } from './ui/GameButton'
import { FlightViewControls } from './ui/FlightViewControls'
import { ShipSizeControls } from './ui/ShipSizeControls'
import './HomeSettingsDialog.css'

export function HomeSettingsDialog({ language, onClose }: { language: LanguageCode; onClose: () => void }) {
  const text = getRaidText(language).menu
  const [landscape, setLandscape] = useRaidFlightView()
  const [quality, setQuality] = useState(getGraphicsQuality)
  const [mix, setMix] = useState(getGameAudioMixSettings)
  const controls: { key: keyof AudioMixSettings; label: string }[] = [
    { key: 'master', label: text.masterVolume }, { key: 'bgm', label: text.bgmVolume },
    { key: 'player', label: text.playerShotsVolume }, { key: 'beam', label: text.beamVolume },
    { key: 'explosion', label: text.explosionVolume }, { key: 'impact', label: text.impactVolume },
    { key: 'ui', label: text.uiVolume },
  ]
  return (
    <GameDialog className="raid__settings-overlay home-settings" aria-labelledby="home-settings-title" onDismiss={onClose}>
      <div className="raid__panel home-settings__panel">
        <header className="home-settings__heading">
          <h2 id="home-settings-title">{text.settings}</h2>
          <GameButton tone="quiet" data-dialog-dismiss onClick={onClose}>{text.close}</GameButton>
        </header>
        <div className="home-settings__sections">
          <FlightViewControls language={language} landscape={landscape} onChange={setLandscape} />
          <ShipSizeControls language={language} />
          <div className="raid__settings-section">
            <span className="raid__settings-heading">{text.graphics}</span>
            <div className="raid__gfx-row raid__gfx-row--settings" role="group" aria-label={text.graphics}>
              {(['low', 'medium', 'high', 'max'] as GraphicsQuality[]).map(value => (
                <button key={value} type="button" className={`raid__gfx-btn${quality === value ? ' raid__gfx-btn--active' : ''}`} aria-pressed={quality === value} onClick={() => { setGraphicsQuality(value); setQuality(value) }}>{text[value]}</button>
              ))}
            </div>
          </div>
          <div className="raid__settings-section home-settings__audio">
            <span className="raid__settings-heading">{text.audioSettings}</span>
            <div className="raid__volume-list">
              {controls.map(control => (
                <label key={control.key} className="raid__volume-control">
                  <span>{control.label}</span>
                  <input type="range" min="0" max="100" step="1" value={Math.round(mix[control.key] * 100)} onChange={event => {
                    const next = { ...mix, [control.key]: Number(event.target.value) / 100 }
                    setGameAudioMixSettings(next)
                    setMix(next)
                  }} />
                  <b>{Math.round(mix[control.key] * 100)}%</b>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GameDialog>
  )
}
