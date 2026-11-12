import { Capacitor, registerPlugin } from '@capacitor/core'

type FlightViewPlugin = { setOrientation(options: { landscape: boolean }): Promise<void> }
const NativeFlightView = registerPlugin<FlightViewPlugin>('FlightView')

export async function requestDisplayOrientation(landscape: boolean) {
  try {
    if (Capacitor.isPluginAvailable('FlightView')) {
      await NativeFlightView.setOrientation({ landscape })
      return
    }
    const orientation = window.screen?.orientation as (ScreenOrientation & {
      lock?: (orientation: 'landscape' | 'portrait') => Promise<void>
    }) | undefined
    if (orientation?.lock) await orientation.lock(landscape ? 'landscape' : 'portrait')
  } catch {
    // Browsers may require fullscreen or manual device rotation. The saved
    // flight view still takes effect, without forcing fullscreen or reloading.
  }
}
