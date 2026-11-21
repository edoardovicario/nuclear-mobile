# Nuclear Mobile (experimental)

Unofficial AGPL-3.0 mobile adaptation of [Nuclear](https://github.com/nukeop/nuclear).
This target lives beside the original desktop player; it does not replace it.
It uses the same React/TypeScript/Rust/Tauri 2 stack, the original Nuclear Track model,
artist formatting and application icon.

## Scope

Search recordings and artists from Internet Archive's open-source audio collection;
only entries declaring a Creative Commons or public-domain license URL are selected.
Open recordings, stream full MP3 files where available, queue tracks, seek, repeat,
save favorites and create local playlists. Media Session integration is best effort
and depends on the OS/WebView. No login or custom server is needed. Search terms and
playback requests are sent to Internet Archive; library data stays on the device.
License declarations come from uploaders and may be incorrect; verify rights before
redistribution. Internet access is required. No telemetry, API credentials or
arbitrary download/plugin execution is included in this target.

The desktop plugin marketplace, yt-dlp, remote control, arbitrary source plugins,
lyrics, native background audio and guaranteed lock-screen playback are not ported.
The mobile UI and backend are separate to avoid bringing desktop-only dependencies
and services into a mobile sandbox. This is an alpha, not a certified release.
No binary or device test is assumed successful until the build and manual checks pass.

## Get started

From the repository root (Node 24 and pnpm as declared in the root package.json):

    corepack enable
    pnpm install --frozen-lockfile
    cd packages/player/mobile
    npm run test
    npm run build

The nested npm scripts use the dependencies already installed for the desktop
player in the parent directory. Do not run a separate npm install here.
Install Rust and the platform tools following https://v2.tauri.app/start/prerequisites/.

### Android

Install Android Studio, SDK, NDK (side-by-side), Java 17 and set ANDROID_HOME and
NDK_HOME as described by Tauri. On macOS the SDK is normally under
~/Library/Android/sdk. Then from this directory:

    rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
    npm run android:init
    npm run android:dev
    npm run android:build

Use a connected device with USB debugging or a configured emulator. The debug
ARM64 APK is under src-tauri/gen/android/app/build/outputs/apk/. For an x86_64
emulator use npm run android:dev and choose the emulator. A release APK/AAB
requires your own signing key; do not commit it.

### iOS (Mac only)

Install full Xcode, open it once, select its command-line tools, install CocoaPods,
and add the Rust targets:

    rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
    npm run ios:init
    npm run ios:dev

Choose an iOS simulator or a connected iPhone with Developer Mode enabled.
For a physical iPhone, select your Apple development team in the generated Xcode
project; use npm run ios:dev -- --open if needed. For the Apple Silicon simulator
build, npm run ios:sim; for a signed device build, npm run ios:build.
Distribution requires appropriate Apple signing/provisioning and compliance with
the store rules and AGPL license. Never add signing credentials to the repository.

The generated platform projects are ignored; initialize each platform once per
checkout. Run commands from packages/player/mobile, not packages/player.

## Test checklist

- On Android and iOS, open the app, search for Jazz, open an item and play an MP3.
- Seek, pause, resume, skip, repeat, and verify end-of-track transitions.
- Favorite a track, create a playlist, add a track, kill/relaunch and verify persistence.
- Verify no-results, no-network, non-playable file and playback error states.
- Check safe areas, rotation, backgrounding, Bluetooth and lock-screen behavior.
  Background and lock-screen behavior is not guaranteed by this version.
- Confirm only declared licensed items are returned and original desktop builds
  remain unaffected.

## License

AGPL-3.0-only; see the upstream license in the repository root. Retain upstream
copyright and make corresponding source available for distributed modified versions.
