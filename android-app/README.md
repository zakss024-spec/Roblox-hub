# ROBLOX HUB Android

An online Android WebView wrapper for the ROBLOX HUB website.

## App details

- Application ID: `com.zakss.robloxhub`
- Minimum Android version: Android 9 (API 28)
- Target SDK: 35
- Website: https://roblox-hub-project-of-zakss.vercel.app/
- Requires an internet connection.
- Website content is served from Vercel, so website deployments appear in the app without rebuilding the APK.

## Roblox data freshness

The Discover page requests public Roblox experience data from the website backend. The backend cache is set to 60 seconds, and the Discover results refresh every 60 seconds while the page is open. Roblox API availability and update timing are not guaranteed to be instantaneous.

## Build APK

1. Open the repository's **Actions** tab.
2. Select **ROBLOX HUB Android APK**.
3. Open the latest successful run.
4. Download the `ROBLOX-HUB-Android-debug` artifact.
5. Extract the ZIP and install `app-debug.apk` on an Android device.

The workflow also runs automatically when files under `android-app/` or the workflow itself change.
