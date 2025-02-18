#!/bin/bash

# Remove the existing moodleapp directory if it exists
if [ -d "/moodleapp" ]; then
  echo "Removing existing /moodleapp directory..."
  rm -rf /moodleapp
fi

# Clone the Moodle app repository
echo "Cloning the Moodle app repository..."
git clone https://github.com/vimalprakash404/moodleapp /moodleapp

# Check if the package.json exists after cloning
if [ ! -f "/moodleapp/package.json" ]; then
  echo "ERROR: package.json not found in /moodleapp."
  exit 1
fi

# Change working directory to the app directory
cd /moodleapp

# Install dependencies
echo "Installing dependencies..."
npm install

# Uninstall old versions of ionic CLI and install the new version
npm uninstall -g ionic
npm install -g @ionic/cli

# Remove existing Android platform and add it again
ionic cordova platform rm android
ionic cordova platform add android

# Build the APK in production mode
echo "Building APK..."
npm run prod:android

ionic cordova build android --release -- --packageType=bundle

docker cp <container_id>:/tmp/moodle-customization/platforms/android/app/build/outputs/apk/debug/app-debug.apk ./app-debug.apk
docker cp <container_id>:/tmp/moodle-customization/platforms/android/app/build/outputs/bundle/release/app-release.aab ./app-release.abb
