# How to Install APK on Android Device/Emulator

## Method 1: Using Android Studio (Easiest)

### For Android Emulator:
1. **Start an Android Emulator:**
   - Open Android Studio
   - Go to **Tools → Device Manager** (or click the device manager icon in the toolbar)
   - Click **▶️ Play** button next to an emulator to start it
   - Wait for the emulator to fully boot

2. **Install APK via Drag & Drop:**
   - Simply drag the APK file (`app-debug.apk` or `app-*.apk`) from Finder/File Explorer
   - Drop it onto the running emulator window
   - The app will automatically install!

### For Physical Device:
1. **Enable USB Debugging on your Android device:**
   - Go to **Settings → About Phone**
   - Tap **Build Number** 7 times to enable Developer Options
   - Go to **Settings → Developer Options**
   - Enable **USB Debugging**

2. **Connect device via USB:**
   - Connect your Android device to your computer via USB
   - On your device, allow USB debugging when prompted

3. **Install via Android Studio:**
   - Open Android Studio
   - Your device should appear in the device dropdown (top toolbar)
   - Drag and drop the APK file onto the device window, OR
   - Use the command line method below

## Method 2: Using Command Line (ADB)

### Prerequisites:
- Android SDK Platform Tools installed (comes with Android Studio)
- Device/Emulator connected

### Steps:

1. **Check if device is connected:**
   ```bash
   adb devices
   ```
   You should see your device listed.

2. **Install the APK:**
   ```bash
   cd /Users/shashi/Desktop/my-projects/wedding/mobile
   adb install app-20251219-181430.apk
   ```
   
   Or if you want to replace an existing installation:
   ```bash
   adb install -r app-20251219-181430.apk
   ```

3. **Verify installation:**
   - The app should appear on your device/emulator
   - Look for "Prisbo" app icon

## Method 3: Direct Install on Physical Device

1. **Transfer APK to device:**
   - Email the APK to yourself
   - Use Google Drive/Dropbox
   - Use USB file transfer
   - Use `adb push`:
     ```bash
     adb push app-20251219-181430.apk /sdcard/Download/
     ```

2. **Install on device:**
   - Open **Files** app on your Android device
   - Navigate to **Downloads** folder
   - Tap on the APK file
   - Allow installation from unknown sources if prompted
   - Tap **Install**

## Troubleshooting

### "Device not found" error:
- Make sure USB debugging is enabled
- Try different USB cable/port
- Restart ADB: `adb kill-server && adb start-server`

### "INSTALL_FAILED_UPDATE_INCOMPATIBLE":
- Uninstall the existing app first: `adb uninstall com.prisbo.mobile`
- Then install again

### "INSTALL_FAILED_INSUFFICIENT_STORAGE":
- Free up space on your device
- Check available storage: `adb shell df -h`

### App crashes after installation:
- Check logs: `adb logcat | grep -i error`
- Make sure the backend API is accessible from the device
- Check if all required permissions are granted

## Quick Install Script

You can also use this script to quickly install:

```bash
#!/bin/bash
cd /Users/shashi/Desktop/my-projects/wedding/mobile
LATEST_APK=$(ls -t app-*.apk 2>/dev/null | head -1)
if [ -z "$LATEST_APK" ]; then
    echo "No APK found. Building first..."
    npm run build:apk
    LATEST_APK=$(ls -t app-*.apk | head -1)
fi
echo "Installing $LATEST_APK..."
adb install -r "$LATEST_APK"
echo "Done! Check your device."
```

Save as `install-apk.sh` and run: `chmod +x install-apk.sh && ./install-apk.sh`



