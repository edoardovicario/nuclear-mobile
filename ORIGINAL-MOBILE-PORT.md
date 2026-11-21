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

## Third milestone — CI fix, Media Session, optional signed beta
The first original frontend build passed. Android runner failed before compiling because sdkmanager was missing; setup-android is now explicitly installed. The original playback manager and queue are connected to the Web Media Session API on mobile; OS lock-screen and background operation still require device validation and native audio handling. This does not port yt-dlp.

### iPhone distribution without a local build
The optional .github/workflows/ios-beta.yml is a manual signed build/upload workflow (not yet tested or invoked). GitHub requires the workflow to exist on the repository default branch before workflow_dispatch is available; after review, add the workflow to the default branch, select original-mobile for the execution. Configure the ios-beta environment with APPLE_API_KEY (key ID), APPLE_API_ISSUER, APPLE_API_PRIVATE_KEY (contents of .p8), APPLE_TEAM_ID. Do not commit any credentials. Use a registered App Store Connect app with bundle identifier com.edoardovicario.nuclearmobile, an authorized paid Developer team and the appropriate signing/provisioning permissions. The operator must explicitly select upload_to_testflight to upload. Apple processing and tester invitation remain necessary. Do not upload a nonfunctional build or assume approval. See https://v2.tauri.app/distribute/sign/ios/ and https://v2.tauri.app/distribute/app-store/.
