# Fix: "Unable to load script" Error

This error occurs because the debug APK is trying to connect to Metro bundler, but Metro isn't running.

## Quick Fix (Option 1): Start Metro Bundler

**For USB-connected device:**
```bash
# Terminal 1: Start Metro bundler
cd /Users/shashi/Desktop/my-projects/wedding/mobile
npm start

# Terminal 2: Forward port (if using USB)
adb reverse tcp:8081 tcp:8081
```

**For device on same Wi-Fi:**
1. Start Metro: `npm start`
2. Note your computer's IP address (shown in Metro output)
3. Shake device → Dev Settings → Debug server host → Enter: `YOUR_IP:8081`
4. Reload app (press R twice or shake → Reload)

## Permanent Fix (Option 2): Rebuild APK with Bundle Included

Rebuild the APK with the JavaScript bundle included (standalone, no Metro needed):

```bash
cd /Users/shashi/Desktop/my-projects/wedding/mobile
./build-apk-local.sh
```

The updated script now automatically bundles the JavaScript, so the APK will work standalone.

## Option 3: Build Release APK (Recommended for Distribution)

For a production-ready APK that includes the bundle:

```bash
npm run build:apk:release
```

Note: Release APKs require signing. See README.md for signing instructions.

## Verify the Fix

After rebuilding, install the new APK:
```bash
adb install -r app-*.apk
```

The app should now work without Metro bundler!



