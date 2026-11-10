import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App.tsx'
import { getPublicAssetUrl } from './components/games/sound'

import './index.css'
import './game-ui.css'

const root = document.getElementById('root')!

// CSS image URLs must be absolute before insertion into a custom property.
// A relative url("./assets/ui/...") can otherwise be interpreted relative to
// the generated /assets/*.css stylesheet instead of the app document, producing
// /assets/assets/ui/... (404) on Netlify and packaged Android WebView.
// Resolve once against the actual document base; this also supports Electron
// file:// and deployment under a subdirectory.
function getUiArtworkCssUrl(path: string) {
  const assetUrl = new URL(getPublicAssetUrl(path), document.baseURI).href
  return `url("${assetUrl}")`
}

root.style.setProperty('--ui-hangar-art', getUiArtworkCssUrl('assets/ui/orbital-hangar-v1.png'))
root.style.setProperty('--ui-console-texture', getUiArtworkCssUrl('assets/ui/console-plate-v1.png'))

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
