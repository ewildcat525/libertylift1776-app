# Liberty Lift 1776 for iOS

This project uses Capacitor 8 to package the deployed Next.js application in a native iOS shell. The live server is intentional: authentication, API routes, cron-backed features, and Supabase SSR cannot run from a static Next.js export.

## First build

Requirements: macOS, Xcode 26 or newer, Node.js 22 or newer, an Apple Developer team, and a reachable deployment at `https://libertylift1776.com`.

```bash
npm install
npm run ios:sync
npm run ios:open
```

In Xcode, select the **App** target, choose your Apple Developer team under Signing & Capabilities, verify the bundle identifier `com.libertylift1776.app`, choose a simulator or device, and Run. Use Product > Archive when preparing an App Store build.

After changing Capacitor configuration, native plugins, or native assets, run `npm run ios:sync`. Rebuild branded icons and launch artwork with `npm run ios:assets`.

## Local development

The committed configuration always defaults to production. Point a local Debug build at the Next.js dev server without committing a machine-specific address:

```bash
CAPACITOR_SERVER_URL=http://192.168.1.20:3000 CAPACITOR_DEBUG=1 npm run ios:sync
```

Use the Mac's LAN address for a physical iPhone. The simulator can normally use `http://localhost:3000`. Run `npm run ios:sync` again without those variables before archiving so the bundled config returns to HTTPS production.

## Deep links

The app accepts both:

- `libertylift1776://dashboard`
- `https://libertylift1776.com/dashboard`

Custom-scheme links work from the generated Xcode project. Universal links additionally require this file to be served without redirects at both `https://libertylift1776.com/.well-known/apple-app-site-association` and the `www` host:

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["APPLE_TEAM_ID.com.libertylift1776.app"],
        "components": [{ "/": "/*" }]
      }
    ]
  }
}
```

Replace `APPLE_TEAM_ID` with the Team ID shown in the Apple Developer portal. Serve it as `application/json`, with no `.json` extension. Add the production HTTPS callback URLs to Supabase Auth's redirect allow list before testing email sign-in.

The Next.js route for this file is already included. Set `APPLE_TEAM_ID` in the production deployment; until it is a valid 10-character team ID, the route deliberately returns `503` so Apple does not cache a bogus association. Keep `https://libertylift1776.com/auth/callback` in Supabase Auth's redirect allow list. For native sign-in, that HTTPS route hands the one-time PKCE code to `libertylift1776://auth/callback`, where the app completes the exchange.

## Native behavior

- Existing Web Share buttons are bridged to the native iOS activity sheet.
- Successful rep logs use a subtle native success haptic on supported devices.
- Incoming custom and universal links route inside the Next.js app.
- Status-bar contrast, non-overlay layout, safe areas, and keyboard resizing are configured for the dark UI.
- App icon and light/dark launch assets are generated from `native/assets/logo.svg`.
- The offline file under `native/web` is the bundled web fallback; core app features still require the production service and network connectivity.

## App Store checklist

1. Replace the placeholder Apple Team ID in the hosted association file and confirm universal links on a signed physical device.
2. Set a unique version/build number in Xcode for each upload.
3. Complete App Privacy answers for account, fitness activity, analytics, and any Supabase-hosted data actually collected by the service.
4. Verify account creation, login links, rep logging, deletion, share sheets, external payment/merch links, and offline/error states on current small and large iPhones plus iPad if iPad remains enabled.
5. Supply App Store screenshots, support/privacy URLs, review credentials, and review notes explaining that the native app provides account-based challenge tracking, live community competition, charts, chat, and native sharing—not merely a marketing website.
6. Archive a Release build after a clean `npm run ios:sync`; confirm the generated `ios/App/App/capacitor.config.json` contains the production HTTPS URL and has web inspection disabled.

Because this is a connected shell, a production outage makes most features unavailable. Apple can also reject thin website wrappers under Guideline 4.2, so the review notes should emphasize the signed-in tracking and community functionality and each release should be tested as a complete native experience.
