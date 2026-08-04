import type { CapacitorConfig } from '@capacitor/cli'
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard'

const productionUrl = 'https://libertylift1776.com'

const config: CapacitorConfig = {
  appId: 'com.libertylift1776.app',
  appName: 'Liberty Lift 1776',
  webDir: 'native/web',
  server: {
    // Server routes and Supabase SSR make this a connected native shell.
    url: process.env.CAPACITOR_SERVER_URL || productionUrl,
    cleartext: process.env.CAPACITOR_SERVER_URL?.startsWith('http://') ?? false,
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
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#10100FFF',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#10100F',
    },
  },
}

export default config
