#!/bin/bash

if [[ $CORDOVA_PLUGINS == *cordova-plugin-moodleapp* ]]; then
    echo "Building cordova-plugin-moodleapp"

    cd cordova-plugin-moodleapp
    npm run prod
fi
