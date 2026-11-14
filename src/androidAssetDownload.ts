import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

interface Progress {
  done: number
  total: number
  message: string
}

const assets = registerPlugin<{
  status(): Promise<{ ready: boolean; bytes: number }>
  prepare(): Promise<void>
  addListener(name: 'progress', listener: (progress: Progress) => void): Promise<PluginListenerHandle>
}>('GameAssets')

const size = (bytes: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(bytes / 1048576) + ' MB'

export async function prepareAndroidAssets() {
  if (Capacitor.getPlatform() !== 'android') return

  const splash = document.getElementById('startup-splash')
  if (!splash) throw new Error('Missing startup screen')
  const panel = document.createElement('section')
  panel.className = 'startup-error startup-download'
  panel.setAttribute('aria-label', 'Game file download')
  const message = document.createElement('p')
  message.setAttribute('aria-live', 'polite')
  const progress = document.createElement('progress')
  progress.setAttribute('aria-label', 'Download progress')
  const button = document.createElement('button')
  button.type = 'button'
  panel.append(message, progress, button)

  let listener: PluginListenerHandle | undefined
  try {
    const status = await assets.status()
    if (status.ready) return
    progress.max = status.bytes
    progress.value = 0
    message.textContent = `Download ${size(status.bytes)} of game files to play offline.`
    button.textContent = 'Download game files'
    splash.append(panel)
    await new Promise<void>(resolve => {
      button.onclick = async () => {
        button.disabled = true
        try {
          listener ??= await assets.addListener('progress', event => {
            progress.max = event.total || 1
            progress.value = event.done
            message.textContent = `${event.message} · ${size(event.done)} / ${size(event.total)}`
          })
          await assets.prepare()
          resolve()
        } catch (error) {
          message.textContent = error instanceof Error ? error.message : 'Download interrupted. Reconnect and retry.'
          button.textContent = 'Retry download'
          button.disabled = false
        }
      }
    })
  } catch (error) {
    console.error('Could not check Android game files', error)
    progress.hidden = true
    message.textContent = 'The game could not check its files.'
    button.textContent = 'Retry opening'
    button.onclick = () => location.reload()
    splash.append(panel)
    await new Promise<void>(() => {})
  } finally {
    panel.remove()
    await listener?.remove().catch(() => {})
  }
}
