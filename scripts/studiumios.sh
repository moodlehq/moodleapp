#!/bin/bash

FICHIER_XCCONFIG_DEBUG="$(pwd)/platforms/ios/cordova/build-debug.xcconfig"
FICHIER_XCCONFIG_RELEASE="$(pwd)/platforms/ios/cordova/build-debug.xcconfig"
LIGNE_A_AJOUTER="SWIFT_OBJC_INTERFACE_HEADER_NAME = Moodle-Swift.h"

echo "Le répertoire courant est : $(pwd)"

cat $FICHIER_XCCONFIG_DEBUG
cat $FICHIER_XCCONFIG_RELEASE

# Vérifier si ios
if [ "$DEVICE_TARGET" != "ios" ]; then
  echo "Rien à faire pour ios"
  exit 1
fi

# if [ "$DEVICE_TARGET" == "ios" ]; then
#   echo "Ajout de ligne $LIGNE_A_AJOUTER dans le debug"
#   echo "$LIGNE_A_AJOUTER" >> "$FICHIER_XCCONFIG_DEBUG"
#   echo "Ajout de ligne $LIGNE_A_AJOUTER dans le release"
#   echo "$LIGNE_A_AJOUTER" >> "$FICHIER_XCCONFIG_RELEASE"
# fi

echo "Ici remplacement chaine"

sed -i '' 's/#import "Moodle-Swift.h"/#import "StudiUM_mobile-Swift.h"/g' "$(pwd)/platforms/ios/StudiUM mobile/Plugins/@moodlehq/phonegap-plugin-push/EncryptionHandler.m"
cat "$(pwd)/platforms/ios/StudiUM mobile/Plugins/@moodlehq/phonegap-plugin-push/EncryptionHandler.m"
