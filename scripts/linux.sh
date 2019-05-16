#!/bin/bash
#
# Script for generating the Desktop builds
#

sudo apt-get install -y libnss3-dev

npm install -g electron-builder electron

electron-builder install-app-deps

jq -s '.[0] + {"name": "moodledesktop"}' package.json > package_new.json
mv package_new.json package.json

rm -Rf desktop/dist

npm run desktop.dist -- -l --x64 --ia32

if [ ! -z $GIT_ORG_PRIVATE ] && [ ! -z $GIT_TOKEN ] ; then
    git clone -q https://$GIT_TOKEN@github.com/moodlemobile/bma-apps-builds.git ../apps

    mv desktop/dist/*.AppImage ../apps

    cd ../apps

    chmod +x *.AppImage
    mv *i386.AppImage linux-ia32.AppImage
    mv Moodle*.AppImage linux-x64.AppImage
    ls
    
    tar -czvf MoodleDesktop32.tar.gz linux-ia32.AppImage
    tar -czvf MoodleDesktop64.tar.gz linux-x64.AppImage
    rm *.AppImage

    git add .
    git commit -m "Linux desktop versions from Travis build $TRAVIS_BUILD_NUMBER"
    git push
fi
