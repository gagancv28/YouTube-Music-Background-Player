# YouTube Music Dedicated Background Player with Ad-Blocker

A React Native mobile application functioning as a background audio player for YouTube Music featuring background audio playback, lock screen media controls, domain restriction allowlist, and an injected ad-blocker engine.

---

## Architecture Overview

1. **WebView Container (`react-native-webview`)**:
   - Renders `https://music.youtube.com` full screen with a desktop/tablet User-Agent to bypass mobile browser background media playback restrictions.
   - Configured with `allowsBackgroundMediaPlayback={true}`, `allowsInlineMediaPlayback={true}`, and `mediaPlaybackRequiresUserAction={false}`.

2. **Background Audio & Native Services**:
   - **Android**: Configured with `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, and `WAKE_LOCK` permissions. Uses `react-native-track-player` `MusicService` to maintain foreground status and audio focus when backgrounded or locked.
   - **iOS**: Configured with `UIBackgroundModes` set to `audio` in `Info.plist`.

3. **Domain Restriction (Allowlist)**:
   - Uses `onShouldStartLoadWithRequest` to restrict navigation to allowed domains:
     - `music.youtube.com`
     - `accounts.google.com`
     - `myaccount.google.com`
     - `ssl.gstatic.com`
     - `apis.google.com`

4. **Bi-Directional Native-JS Lock Screen Bridge**:
   - **JavaScript Injection (`src/injectedJS.ts`)**: Monitors DOM HTML5 `<video>` element state and extracts track metadata (Title, Artist, Cover Art) in real time. Sends JSON events to React Native via `window.ReactNativeWebView.postMessage()`.
   - **Native Controls**: `react-native-track-player` receives remote lock screen inputs (Play, Pause, Next, Previous) and executes `webView.injectJavaScript('window.__YT_PLAY()')`, etc.

5. **Integrated Ad-Blocker Engine**:
   - **DOM MutationObserver**: Detects ad elements dynamically with negligible performance overhead.
   - **Auto-Skip**: Instantly clicks skip ad buttons (`.ytp-ad-skip-button`, `.ytp-ad-skip-button-modern`, `.videoAdUiSkipButton`).
   - **Fast-Forward & Mute**: When an unskippable video ad plays (`.ad-showing`), mutes the `<video>` element (`muted = true`) and sets `playbackRate = 16.0`. Restores volume and 1.0x speed when song resumes.
   - **CSS Suppression**: Injects custom CSS rules hiding UI ad banners, upgrade popups, and mealbars (`display: none !important`).

---

## Setup & Installation Instructions

### Prerequisites
- **Node.js**: `>= 18.x`
- **React Native CLI**: installed globally or via `npx`
- **Android Studio & SDK** (for Android build): SDK 34+
- **Xcode & CocoaPods** (for iOS build): iOS 15.0+ target

### 1. Install Project Dependencies
Run the following command in the project directory:

```bash
npm install
```

### 2. iOS Configuration & Pods Setup
For iOS, install CocoaPods dependencies:

```bash
cd ios
pod install
cd ..
```

Ensure `ios/YTMusicPlayer/Info.plist` contains the background audio capability:
```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
</array>
```

### 3. Android Configuration
Verify `android/app/src/main/AndroidManifest.xml` includes foreground service permissions and service registration:

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<service
    android:name="com.doublesymmetry.trackplayer.service.MusicService"
    android:enabled="true"
    android:exported="true"
    android:foregroundServiceType="mediaPlayback">
    <intent-filter>
        <action android:name="android.intent.action.MEDIA_BUTTON" />
    </intent-filter>
</service>
```

---

## Running the Application

### Start Metro Bundler
```bash
npm start
```

### Run on Android
```bash
npm run android
```

### Run on iOS
```bash
npm run ios
```

---

## Key Files Reference

- [package.json](file:///c:/Users/Gagan/Desktop/yt%20premium/package.json) - Dependencies & Scripts
- [App.tsx](file:///c:/Users/Gagan/Desktop/yt%20premium/App.tsx) - Fullscreen WebView, Allowlist, and TrackPlayer setup
- [src/injectedJS.ts](file:///c:/Users/Gagan/Desktop/yt%20premium/src/injectedJS.ts) - Injected Ad-Blocker, State Sync & Media Controls Script
- [src/service.ts](file:///c:/Users/Gagan/Desktop/yt%20premium/src/service.ts) - TrackPlayer Remote Controls Event Handler
- [android/app/src/main/AndroidManifest.xml](file:///c:/Users/Gagan/Desktop/yt%20premium/android/app/src/main/AndroidManifest.xml) - Android Permissions & Services
- [ios/YTMusicPlayer/Info.plist](file:///c:/Users/Gagan/Desktop/yt%20premium/ios/YTMusicPlayer/Info.plist) - iOS Background Audio plist config
