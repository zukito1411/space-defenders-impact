import ReactDOM from 'react-dom/client'
import { GradiusRaid } from '../src/components/games/GradiusRaid'
import { SpaceDoorProvider } from '../src/components/ui/SpaceDoor'
import '../src/index.css'
import '../src/App.css'
import '../src/game-ui.css'
import '../src/landscape-ui.css'
const root = document.getElementById('root')!
root.style.setProperty('--ui-hangar-art', 'url("/assets/ui/orbital-hangar-v1.png")')
root.style.setProperty('--ui-console-texture', 'url("/assets/ui/console-plate-v1.png")')
ReactDOM.createRoot(root).render(<SpaceDoorProvider><GradiusRaid onClose={() => {}} playerName="Presentation QA" language="en" /></SpaceDoorProvider>)
