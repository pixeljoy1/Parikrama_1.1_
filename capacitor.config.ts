import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor wraps the built web app (dist/) in an Android WebView so it can be
 * packaged as an installable .apk. The android/ project is generated in CI.
 * Geolocation flows through the WebView permission bridge; the CI step adds
 * ACCESS_FINE_LOCATION to the manifest.
 */
const config: CapacitorConfig = {
  appId: 'net.wizardcomm.parikrama',
  appName: 'Parikrama',
  webDir: 'dist',
  backgroundColor: '#F6F1E7',
}

export default config
