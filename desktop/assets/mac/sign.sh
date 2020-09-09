#!/bin/bash
#
# Script to sign macOSX pkg.
# https://www.electronjs.org/docs/tutorial/mac-app-store-submission-guide
#

# Name of your app.
APP="Moodle Desktop"
# The name of certificates you requested.
APP_KEY="3rd Party Mac Developer Application: Moodle Pty Ltd (2NU57U5PAW)"
INSTALLER_KEY="3rd Party Mac Developer Installer: Moodle Pty Ltd (2NU57U5PAW)"


BASEPATH="desktop/dist/mas"
# The path of your app to sign.
APP_PATH="${BASEPATH}/${APP}.app"
# The path to the location you want to put the signed package.
RESULT_PATH="${BASEPATH}/${APP}.pkg"

# The path of your plist files.
CHILD_PLIST="desktop/assets/mac/child.plist"
PARENT_PLIST="desktop/assets/mac/parent.plist"
LOGINHELPER_PLIST="desktop/assets/mac/loginhelper.plist"

FRAMEWORKS_PATH="$APP_PATH/Contents/Frameworks"

codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/Electron Framework.framework/Versions/A/Electron Framework"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/Electron Framework.framework/Versions/A/Libraries/libffmpeg.dylib"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/Electron Framework.framework/Versions/A/Libraries/libnode.dylib"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/Electron Framework.framework"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/$APP Helper.app/Contents/MacOS/$APP Helper"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$FRAMEWORKS_PATH/$APP Helper.app/"
codesign -s "$APP_KEY" -f --entitlements "$LOGINHELPER_PLIST" "$APP_PATH/Contents/Library/LoginItems/$APP Login Helper.app/Contents/MacOS/$APP Login Helper"
codesign -s "$APP_KEY" -f --entitlements "$LOGINHELPER_PLIST" "$APP_PATH/Contents/Library/LoginItems/$APP Login Helper.app/"
codesign -s "$APP_KEY" -f --entitlements "$CHILD_PLIST" "$APP_PATH/Contents/MacOS/$APP"
codesign -s "$APP_KEY" -f --entitlements "$PARENT_PLIST" "$APP_PATH"

productbuild --component "$APP_PATH" /Applications --sign "$INSTALLER_KEY" "$RESULT_PATH"
