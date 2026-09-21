# Liberty Lift 1776 for iOS

This project uses Capacitor 8 to package the deployed Next.js application in a native iOS shell. The app launches through a bundled connectivity screen and then hands off to the deployed service because authentication, API routes, and Supabase SSR cannot run from a static Next.js export.

## First build

Requirements: macOS, Xcode 26 or newer, Node.js 22 or newer, an Apple Developer team, and a reachable deployment at `https://libertylift1776.com`.

```bash
npm install
npm run ios:sync
npm run ios:open
```

In Xcode, select the **App** target, confirm the Kevin Abbas team under Signing & Capabilities, verify the bundle identifier `com.libertylift1776.app`, choose a simulator or device, and Run. Use Product > Archive when preparing an App Store build.

After changing Capacitor configuration, native plugins, or native assets, run `npm run ios:sync`. Rebuild branded icons and launch artwork with `npm run ios:assets`.

## Local development

Release builds start from the bundled connectivity screen and navigate to production. Point a local Debug build directly at the Next.js dev server without committing a machine-specific address:

```bash
CAPACITOR_SERVER_URL=http://192.168.1.20:3000 CAPACITOR_DEBUG=1 npm run ios:sync
```

Use the Mac's LAN address for a physical iPhone. The simulator can normally use `http://localhost:3000`. Run `npm run ios:sync` again without those variables before archiving so the bundled startup screen is restored.

## Deep links

The app accepts both:

- `libertylift1776://dashboard`
- `https://libertylift1776.com/dashboard`

Custom-scheme links work from the generated Xcode project. Universal links additionally require this file to be served without redirects at `https://libertylift1776.com/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["5Y6982PX8P.com.libertylift1776.app"],
        "components": [{ "/": "/*" }]
      }
    ]
  }
}
```

Serve it as `application/json`, with no `.json` extension. Add the production HTTPS callback URL to Supabase Auth's redirect allow list before testing email sign-in.

The Next.js route already defaults to the production Apple Team ID; `APPLE_TEAM_ID` remains available as an explicit deployment override. Keep `https://libertylift1776.com/auth/callback` in Supabase Auth's redirect allow list. For native sign-in, that HTTPS route hands the one-time PKCE code to `libertylift1776://auth/callback`, where the app completes the exchange.

## Native behavior

- Existing Web Share buttons are bridged to the native iOS activity sheet.
- Successful rep logs use a subtle native success haptic on supported devices.
- Incoming custom and universal links route inside the Next.js app.
- Status-bar contrast, non-overlay layout, safe areas, and keyboard resizing are configured for the dark UI.
- App icon and light/dark launch assets are generated from `native/assets/logo.svg`.
- The bundled startup screen checks availability before navigating to production and remains usable as an offline/retry state; core app features still require the production service and network connectivity.

### Navigation

Native builds hide the web navigation (`html[data-app-environment='native'] .campaign-nav`) and replace it with two pieces of chrome:

- `NativeAppNavigation` — the bottom tab bar (Today, Standings, Crews, Me, plus the centre Log button). It renders only for a signed-in patriot.
- `NativeScreenHeader` — a title and back chevron on every screen the tab bar does not own, and on the root tabs too whenever the tab bar is absent. It also carries the notification bell, which otherwise lives only in the hidden web nav.

Both are mounted globally in `src/app/layout.tsx`. The header sits at z-index 195: above the tab bar (190), below the bottom-sheet backdrops (198) so an open sheet covers it. Any new full-screen overlay must clear 195 or it will render beneath the header — the Hall of Honor ceremony is lifted to 210 for exactly this reason.

A screen whose top spacing is not built from `.app-surface` with a `pt-*` utility needs its own rule under `html[data-app-environment='native'].native-header-visible`, or the header will overlap its first line.

Because the tab bar is signed-in only, and the association file maps shared links to the app, assume any screen can be a signed-out cold start with no history to swipe back through. The header is what keeps those screens escapable; check it renders before shipping a new route.

### Deep links on cold start

The bundled startup screen reads the launch URL and navigates straight to that path on production rather than loading the homepage first. `/auth/*` is the deliberate exception: the PKCE verifier lives in this WebView, so auth launches load the app normally and `NativeBridge` completes the exchange on the client. The reachability probe stays pointed at the origin, so a link to a handle that no longer exists reports a 404 instead of claiming the device is offline.

The association file excludes `/auth/*` and `/api/*` for the same reason — a plain HTTPS auth link belongs to whichever browser requested it, because that is where its verifier is.

## App Store checklist

1. Confirm the hosted association file returns `200` and test universal links on a signed physical device.
2. Set a unique version/build number in Xcode for each upload.
3. Complete App Privacy answers for account, fitness activity, analytics, and any Supabase-hosted data actually collected by the service.
4. Verify account creation, login links, rep logging, deletion, share sheets, external payment/merch links, and offline/error states on current small and large iPhones plus iPad if iPad remains enabled.
5. Supply App Store screenshots, support/privacy URLs, review credentials, and review notes explaining that the native app provides account-based challenge tracking, live community competition, charts, chat, and native sharing—not merely a marketing website.
6. Archive a Release build after a clean `npm run ios:sync`; confirm the generated `ios/App/App/capacitor.config.json` has no development `server.url` and web inspection is disabled.

## Known gaps

Deliberately not addressed in the shell, and each needs a decision or Apple-side setup before it can be:

- **Push notifications.** The campaign re-engages patriots by email (`/api/cron/reminders`) and by an in-app bell, so a backgrounded app cannot be reached at all — no streak-at-risk nudge, no chat mention, no "you just got passed". This is the largest remaining product gap. It needs an APNs key and the Push Notifications capability on the App ID before `@capacitor/push-notifications` can be added; adding the entitlement before the portal is configured breaks signing, so it is left out rather than half-wired.
- **iPad.** `TARGETED_DEVICE_FAMILY` is `1,2`, so the app ships to iPad, but no layout has been verified there. Either test it or drop to `1` before submitting.
- **No iOS CI.** Nothing builds or archives the app automatically, and the repo has no lint or build workflow at all, so a change can break the shell with no signal until someone opens Xcode.

`PrivacyInfo.xcprivacy` was reviewed rather than changed. `NSPrivacyAccessedAPITypes` is empty, which matches what Capacitor declares in its own manifests — no installed plugin touches UserDefaults or any other required-reason API, so there is nothing to declare. The collected-data entries are deliberately inclusive: a self-selected home state is coarse location, and the merch and next-season emails are marketing, so both declarations stand.

Because this is a connected shell, a production outage makes most features unavailable. Apple can also reject thin website wrappers under Guideline 4.2, so the review notes should emphasize the signed-in tracking and community functionality and each release should be tested as a complete native experience.
