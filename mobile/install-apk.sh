#!/bin/bash

# Quick APK Install Script
# This script finds the latest APK and installs it on a connected device/emulator

cd "$(dirname "$0")"

# Find the latest APK
LATEST_APK=$(ls -t app-*.apk android/app/build/outputs/apk/debug/app-debug.apk 2>/dev/null | head -1)

if [ -z "$LATEST_APK" ]; then
    echo "❌ No APK found!"
    echo "Building APK first..."
    npm run build:apk
    LATEST_APK=$(ls -t app-*.apk android/app/build/outputs/apk/debug/app-debug.apk 2>/dev/null | head -1)
fi

if [ -z "$LATEST_APK" ]; then
    echo "❌ Failed to find or build APK"
    exit 1
fi

echo "📱 Checking for connected devices..."
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')

if [ "$DEVICES" -eq 0 ]; then
    echo "❌ No devices found!"
    echo ""
    echo "Please:"
    echo "  1. Start an Android emulator, OR"
    echo "  2. Connect a physical device with USB debugging enabled"
    echo ""
    echo "Then run: adb devices"
    exit 1
fi

echo "✅ Found $DEVICES device(s)"
echo "📦 Installing: $LATEST_APK"
echo ""

# Install the APK (replace if exists)
adb install -r "$LATEST_APK"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation successful!"
    echo "📱 Check your device for the 'Prisbo' app"
else
    echo ""
    echo "❌ Installation failed"
    echo "Try: adb uninstall com.prisbo.mobile (to uninstall first)"
    exit 1
fi



