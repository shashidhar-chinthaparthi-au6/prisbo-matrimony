#!/bin/bash

# Local APK Build Script (without EAS)
# This script builds an APK locally using Gradle

set -e  # Exit on error

echo "🚀 Starting local APK build process..."
echo ""

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "❌ Error: Java is not installed. Please install JDK 17 or later."
    exit 1
fi

# Check if Android SDK is configured
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  Warning: ANDROID_HOME is not set."
    echo "   Please set it in your shell profile (e.g., ~/.zshrc or ~/.bashrc):"
    echo "   export ANDROID_HOME=\$HOME/Library/Android/sdk"
    echo "   export PATH=\$PATH:\$ANDROID_HOME/tools:\$ANDROID_HOME/platform-tools"
    exit 1
fi

# Check if expo-cli or npx expo is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is not installed. Please install Node.js."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Step 1: Install dependencies (skip if already installed)
if [ ! -d "node_modules" ]; then
    echo "📦 Step 1: Installing dependencies..."
    npm install --legacy-peer-deps
    echo ""
else
    echo "📦 Step 1: Dependencies already installed, skipping..."
    echo ""
fi

# Step 2: Generate native code
echo "🔧 Step 2: Generating native Android project..."
npx expo prebuild --platform android --clean
echo ""

# Step 2.5: Bundle JavaScript for standalone APK
echo "📦 Step 2.5: Bundling JavaScript for standalone APK..."
# Ensure assets directory exists
mkdir -p android/app/src/main/assets
mkdir -p android/app/src/main/res

echo "   Bundling JavaScript (this may take a minute)..."

# Set NODE_ENV to production for optimized bundle
export NODE_ENV=production

# Get the entry file from package.json
ENTRY_FILE=$(node -p "require('./package.json').main || 'index.js'")
echo "   Entry file: $ENTRY_FILE"

# Install React Native CLI if not present (needed for bundling)
if ! npm list @react-native-community/cli &>/dev/null; then
    echo "   Installing @react-native-community/cli (required for bundling)..."
    npm install --save-dev @react-native-community/cli --legacy-peer-deps --silent
fi

# Bundle JavaScript using React Native CLI
npx @react-native-community/cli bundle \
  --platform android \
  --dev false \
  --entry-file "$ENTRY_FILE" \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/ \
  --sourcemap-output android/app/src/main/assets/index.android.bundle.map \
  --reset-cache

# Verify bundle was created
if [ -f "android/app/src/main/assets/index.android.bundle" ]; then
    BUNDLE_SIZE=$(du -h android/app/src/main/assets/index.android.bundle | cut -f1)
    echo "✅ JavaScript bundle created ($BUNDLE_SIZE)"
else
    echo "❌ Error: Bundle was not created!"
    exit 1
fi
echo ""

# Step 3: Build APK using Gradle
echo "🏗️  Step 3: Building APK with Gradle..."
cd android

# Clean previous builds
./gradlew clean

# Build debug APK (faster, for testing)
if [ "$1" == "--release" ]; then
    echo "   Building RELEASE APK (signed)..."
    ./gradlew assembleRelease
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
else
    echo "   Building DEBUG APK (unsigned, for testing)..."
    ./gradlew assembleDebug
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

cd ..

# Check if APK was created
if [ -f "android/$APK_PATH" ]; then
    echo ""
    echo "✅ Build successful!"
    echo "📱 APK location: android/$APK_PATH"
    echo ""
    
    # Copy APK to root for easy access
    cp "android/$APK_PATH" "app-$(date +%Y%m%d-%H%M%S).apk"
    echo "📋 APK also copied to: app-$(date +%Y%m%d-%H%M%S).apk"
    echo ""
    echo "💡 To install on a connected device:"
    echo "   adb install app-*.apk"
else
    echo ""
    echo "❌ Error: APK was not created. Check the build logs above."
    exit 1
fi

