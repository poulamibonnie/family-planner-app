'use client';

import { useEffect } from 'react';

/**
 * Runs only inside the native Capacitor (iOS) shell; a no-op in the browser.
 *
 *  - Styles the status bar for the light app background and hides the splash
 *    screen once the web content is ready.
 *  - Listens for the OAuth return deep link (familyplanner://oauth?google=…)
 *    fired after Google consent completes in the system browser, closes that
 *    browser, and reloads the dashboard so the new connection is reflected.
 *
 * All Capacitor plugins are imported dynamically inside the effect so nothing
 * touches native APIs during SSR / the Next build.
 */
export default function NativeBootstrap() {
  useEffect(() => {
    let removeListener: (() => void) | undefined;

    (async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
        import('@capacitor/status-bar'),
        import('@capacitor/splash-screen'),
        import('@capacitor/app'),
      ]);

      // Dark icons/text on the light (#FAFAF8) background.
      try { await StatusBar.setStyle({ style: Style.Light }); } catch { /* unsupported */ }
      try { await SplashScreen.hide(); } catch { /* already hidden */ }

      const handle = await App.addListener('appUrlOpen', async ({ url }) => {
        if (!url.startsWith('familyplanner://oauth')) return;
        const status = new URL(url).searchParams.get('google') ?? 'error';
        try {
          const { Browser } = await import('@capacitor/browser');
          await Browser.close();
        } catch { /* browser may already be closed */ }
        // Full reload so the Self page re-fetches the Google connection state.
        window.location.href = `/dashboard/self?google=${status}`;
      });
      removeListener = () => handle.remove();
    })();

    return () => removeListener?.();
  }, []);

  return null;
}
