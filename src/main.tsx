import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App.tsx'
import { getPublicAssetUrl } from './components/games/sound'

import './index.css'
import './game-ui.css'

const root = document.getElementById('root')!
// Resolve generated art through the same base URL as the game's ship assets,
// including Electron's file URL and the Android packaged web directory.
root.style.setProperty('--ui-hangar-art', `url("${getPublicAssetUrl('assets/ui/orbital-hangar-v1.png')}")`)
root.style.setProperty('--ui-console-texture', `url("${getPublicAssetUrl('assets/ui/console-plate-v1.png')}")`)

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

function isAndroidWebView() {
  if (typeof navigator === 'undefined') return false
  const userAgent = navigator.userAgent.toLowerCase()
  return userAgent.includes('; wv') || userAgent.includes('version/4.0 chrome')
}

if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  window.isSecureContext &&
  (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
) {
  if (isAndroidWebView()) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch((error) => {
          console.warn('Service worker cleanup failed:', error)
        })
    })
  } else {
    window.addEventListener('load', () => {
      void import('virtual:pwa-register')
        .then(({ registerSW }) => {
          registerSW({
            immediate: true,
            onRegisterError(error) {
              console.warn('Service worker registration failed:', error)
            },
          })
        })
        .catch((error) => {
          console.warn('PWA registration module failed:', error)
        })
    })
  }
}
