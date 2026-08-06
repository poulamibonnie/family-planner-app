import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the iOS shell.
 *
 * This app's backend is Next.js Server Actions + an iron-session cookie, so it
 * cannot be statically exported. Instead the native WKWebView loads the LIVE
 * deployed site (server.url), and every server action / OAuth / email flow works
 * exactly as it does in a browser. See docs/DECISIONS.md (Capacitor ADR).
 *
 * REQUIRED before `npm run cap:sync`: set CAP_SERVER_URL to the production
 * HTTPS origin (e.g. https://familyplanner.example.com). It MUST be https —
 * the iron-session cookie is `secure`, and Google OAuth rejects non-https.
 * The localhost fallback below only exists so the config type-checks on Windows;
 * a device cannot reach it.
 */
const serverUrl = process.env.CAP_SERVER_URL ?? 'https://REPLACE_WITH_PROD_URL';

const config: CapacitorConfig = {
  appId: 'com.familyplanner.app',
  appName: 'FamilyPlanner',
  // Placeholder web assets. We load remote content via server.url, but Capacitor
  // still requires a webDir to exist (see www/index.html — a splash fallback).
  webDir: 'www',
  ios: {
    // Match the app background so there is no white flash before the site loads.
    backgroundColor: '#FAFAF8',
    // Avoid rubber-band overscroll revealing a blank area behind the web content.
    scrollEnabled: true,
  },
  server: {
    url: serverUrl,
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#FAFAF8',
      showSpinner: false,
    },
  },
};

export default config;
