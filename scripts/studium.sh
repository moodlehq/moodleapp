#!/bin/bash

# Valeurs par défaut
STUDIUM_ENV="prod"
DEVICE_TARGET="android"

# Si des arguments sont fournis, on les utilise
if [ ! -z "$1" ]; then
  STUDIUM_ENV=$1
fi

if [ ! -z "$2" ]; then
  DEVICE_TARGET=$2
fi

# Vérifier les valeurs possibles
if [[ "$STUDIUM_ENV" != "preprod" && "$STUDIUM_ENV" != "prod" ]]; then
  echo "Erreur: STUDIUM_ENV doit être 'preprod' ou 'prod'."
  exit 1
fi

if [[ "$DEVICE_TARGET" != "android" && "$DEVICE_TARGET" != "ios" ]]; then
  echo "Erreur: DEVICE_TARGET doit être 'android' ou 'ios'."
  exit 1
fi

# Déterminer le fichier source
SOURCE_FILE="studium-$STUDIUM_ENV-$DEVICE_TARGET.config.json"

# Vérifier si le fichier existe
if [ ! -f "$SOURCE_FILE" ]; then
  echo "Erreur: le fichier $SOURCE_FILE n'existe pas."
  exit 1
fi

# Copier le fichier
cp "$SOURCE_FILE" moodle.config.json

# Confirmation
echo "Le fichier $SOURCE_FILE a été copié avec succès vers moodle.config.json"

# Déterminer le fichier source
SOURCE_FILE_XML="config.$DEVICE_TARGET.xml"

# Vérifier si le fichier xml existe
if [ ! -f "$SOURCE_FILE_XML" ]; then
  echo "Erreur: le fichier $SOURCE_FILE_XML n'existe pas."
  exit 1
fi

# Copier le fichier
cp "$SOURCE_FILE_XML" config.xml

# Confirmation
echo "Le fichier $SOURCE_FILE_XML a été copié avec succès vers config.xml"

# Générer le fichier google-services.json
echo $GOOGLE_SERVICES > google-services.json

echo "Le fichier google-services.json a été généré avec succès"
