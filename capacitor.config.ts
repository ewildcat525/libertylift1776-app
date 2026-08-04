import type { CapacitorConfig } from '@capacitor/cli'
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard'

const productionUrl = 'https://libertylift1776.com'
const developmentServerUrl = process.env.CAPACITOR_SERVER_URL

const config: CapacitorConfig = {
  appId: 'com.libertylift1776.app',
  appName: 'Liberty Lift 1776',
  webDir: 'native/web',
  server: {
    // Release builds start from the bundled availability screen, which then
    // hands off to production. This gives the app a useful cold-start state
    // when the device is offline instead of WKWebView's network error page.
    ...(developmentServerUrl
      ? {
          url: developmentServerUrl,
          cleartext: developmentServerUrl.startsWith('http://'),
        }
      : {}),
    allowNavigation: ['libertylift1776.com', '*.libertylift1776.com'],
  },
  ios: {
    backgroundColor: '#10100F',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'LibertyLift',
    webContentsDebuggingEnabled: process.env.CAPACITOR_DEBUG === '1',
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Native,
      resizeOnFullScreen: true,
      style: KeyboardStyle.Dark,
    },
    SplashScreen: {
      // NativeBridge hides this as soon as the remote app is interactive. The
      // duration is a safety valve for an older web deployment or JS failure.
      launchShowDuration: 6000,
      launchAutoHide: true,
      backgroundColor: '#10100FFF',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#10100F',
    },
  },
}

export default config
