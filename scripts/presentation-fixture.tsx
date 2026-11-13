import { createEmptyProgress, saveProgress } from '../src/progression'
import ReactDOM from 'react-dom/client'
import { GradiusRaid } from '../src/components/games/GradiusRaid'
import { SpaceDoorProvider } from '../src/components/ui/SpaceDoor'
import '../src/index.css'
import '../src/App.css'
import '../src/game-ui.css'
import '../src/landscape-ui.css'
const previewModel = new URLSearchParams(location.search).get('model')
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
ReactDOM.createRoot(root).render(<SpaceDoorProvider><GradiusRaid onClose={() => {}} playerName="Presentation QA" language="en" initialShipKey={previewModel ? 'coreLander' : undefined} /></SpaceDoorProvider>)
