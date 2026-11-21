# Original Nuclear mobile port — work in progress
This branch starts from the unmodified upstream Nuclear 1.56.4 source, not from the separate experimental player or PWA. It keeps the original UI components, plugin SDK/loader, search, metadata, queue, favorites, playlists, audio pipeline and original streaming providers at source level. The first change adds a narrow-screen workspace and avoids desktop window calls on mobile. No claim of mobile runtime compatibility is made.

## Remaining platform blockers
- Compile original Rust backend with mobile-specific feature guards for desktop media controls, desktop updater and window-state, Discord IPC and desktop-only process/path dependencies.
- Provide mobile-compatible implementations for original plugin host services, including filesystem, HTTP and the yt-dlp process interface. Current upstream executable installer only handles desktop platforms. A web app cannot run those native binaries. Any provider implementation must respect source permissions, platform policies and content rights. Do not substitute catalog providers silently.
- Adapt original top bar, player controls, settings and touch gestures; test original plugin flows and audio protocols on both devices.
- Implement and verify native audio session/background playback and media controls.
- Add Android and iOS CI for this original target. Android can distribute a signed APK. iOS physical-device distribution requires valid provisioning/signing and an appropriate distribution channel; unsigned CI output cannot simply be opened on an iPhone. Browser installation is not the same as native distribution.
- Test parity against upstream with the same legally accessible source plugins, search, tracks, lyrics and playlist workflows. No guarantee of universal availability.
- Keep AGPL source and upstream attribution. Do not claim feature parity until validated.

The previous pwa and mobile-port branches are separate experiments, not equivalent versions of Nuclear.

## Second milestone
Desktop-only plugins are guarded, the original streaming/provider code is preserved, and mobile CI compiles the original player. Discord IPC and standalone yt-dlp explicitly report unavailable on mobile. No replacement providers, no claim of full parity or playable builds. Native background controls, provider compatibility, device tests and iOS signing still remain. Android debug artifact is installable only after successful build; iOS simulator output is not a signed iPhone app.
