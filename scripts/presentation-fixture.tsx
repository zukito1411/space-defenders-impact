import { createEmptyProgress, saveProgress } from '../src/progression'
import ReactDOM from 'react-dom/client'
import { GradiusRaid } from '../src/components/games/GradiusRaid'
import { RaidCarrierBriefing } from '../src/components/games/raid/RaidCarrierBriefing'
import { SpaceDoorProvider } from '../src/components/ui/SpaceDoor'
import '../src/index.css'
import '../src/App.css'
import '../src/game-ui.css'
import '../src/landscape-ui.css'
const params = new URLSearchParams(location.search)
const previewModel = params.get('model')
if (previewModel === 'godGundam' || previewModel === 'spiegel') {
  const progress = createEmptyProgress()
  progress.gradiusEndlessTotalScore = 5000000
  progress.shipMastery.coreLander = { xp: 0, level: 1, runs: 1, bestScore: 1000000, totalScore: 1000000, victories: 0 }
  progress.coreLanderModel = previewModel
  saveProgress(progress, false)
}
const root = document.getElementById('root')!
root.style.setProperty('--ui-hangar-art', 'url("/assets/ui/orbital-hangar-v1.png")')
root.style.setProperty('--ui-console-texture', 'url("/assets/ui/console-plate-v1.png")')
const briefing = params.get('briefing')
const app = briefing
  ? <div className="raid raid--landscape" style={{ position: 'absolute', inset: 0 }}>
    <RaidCarrierBriefing language="en" mode="campaign" stage={briefing === 'ending' ? 15 : Number(briefing)}
      shipName="Interceptor" underway={false} canLaunch debrief={briefing === 'ending'} onInterception={() => {}}
      onLaunch={() => { root.dataset.briefingComplete = 'true' }} />
  </div>
  : <SpaceDoorProvider><GradiusRaid onClose={() => {}} playerName="Presentation QA" language="en" initialMode={params.get('mode') === 'endless' ? 'endless' : 'campaign'} initialShipKey={previewModel ? 'coreLander' : undefined} /></SpaceDoorProvider>
ReactDOM.createRoot(root).render(app)
