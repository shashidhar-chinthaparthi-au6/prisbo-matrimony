#!/bin/bash

# Build APK using EAS Build
echo "Starting APK build process..."
echo ""
echo "Step 1: Make sure you're logged in to Expo"
echo "Run: eas login (if not already logged in)"
echo ""
echo "Step 2: Initialize EAS project (if not already done)"
echo "Run: eas init"
echo "  - Select your account when prompted"
echo "  - Confirm project creation"
echo ""
echo "Step 3: Build the APK"
echo "Run: eas build --platform android --profile preview"
echo ""
echo "The build will take 10-20 minutes. You'll get a download link when it's ready."
echo ""
echo "To download the APK after build completes:"
echo "Run: eas build:list"
echo "Then download from the provided URL"

