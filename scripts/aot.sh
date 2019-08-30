#!/bin/bash

# List first level of installed libraries so we can check the installed versions.
npm list --depth=0

# Compile AOT.
if [ $TRAVIS_BRANCH == 'integration' ] || [ $TRAVIS_BRANCH == 'master' ] || [ $TRAVIS_BRANCH == 'desktop' ] || [ -z $TRAVIS_BRANCH ] ; then
    cd scripts
    ./build_lang.sh
    cd ..

    if [ "$TRAVIS_BRANCH" == 'master' ] && [ ! -z $GIT_TOKEN ] ; then
        git remote set-url origin https://$GIT_TOKEN@github.com/$TRAVIS_REPO_SLUG.git
        git fetch -q origin
        git add src/assets/lang
        git add */en.json
        git commit -m 'Update lang files [ci skip]'
        git push origin HEAD:$TRAVIS_BRANCH

        version=`grep versionname src/config.json| cut -d: -f2|cut -d'"' -f2`
        date=`date +%Y%m%d`'00'

        pushd ../moodle-local_moodlemobileapp
        sed -ie "s/release[ ]*=[ ]*'[^']*';/release = '$version';/1" version.php
        sed -ie "s/version[ ]*=[ ]*[0-9]*;/version = $date;/1" version.php
        rm version.phpe
        git remote set-url origin https://$GIT_TOKEN@github.com/moodlehq/moodle-local_moodlemobileapp.git
        git fetch -q origin
        git add .
        git commit -m "Update lang files from $version"
        git push
        popd
    fi

    sed -ie $'s~throw new Error("No ResourceLoader.*~url = "templates/" + url;\\\nvar resolve;\\\nvar reject;\\\nvar promise = new Promise(function (res, rej) {\\\nresolve = res;\\\nreject = rej;\\\n});\\\nvar xhr = new XMLHttpRequest();\\\nxhr.open("GET", url, true);\\\nxhr.responseType = "text";\\\nxhr.onload = function () {\\\nvar response = xhr.response || xhr.responseText;\\\nvar status = xhr.status === 1223 ? 204 : xhr.status;\\\nif (status === 0) {\\\nstatus = response ? 200 : 0;\\\n}\\\nif (200 <= status \&\& status <= 300) {\\\nresolve(response);\\\n}\\\nelse {\\\nreject("Failed to load " + url);\\\n}\\\n};\\\nxhr.onerror = function () { reject("Failed to load " + url); };\\\nxhr.send();\\\nreturn promise;\\\n~g' node_modules/@angular/platform-browser-dynamic/esm5/platform-browser-dynamic.js
    sed -ie "s/context\.isProd || hasArg('--minifyJs')/hasArg('--minifyJs')/g" node_modules/@ionic/app-scripts/dist/util/config.js
    sed -ie "s/context\.isProd || hasArg('--optimizeJs')/hasArg('--optimizeJs')/g" node_modules/@ionic/app-scripts/dist/util/config.js
    npm run ionic:build -- --prod
fi

# Copy to PGB git (only on a configured travis build).
if [ ! -z $GIT_ORG ] && [ ! -z $GIT_TOKEN ] ; then
    gitfolder=${PWD##*/}
    git clone --depth 1 --no-single-branch https://github.com/$GIT_ORG/moodlemobile-phonegapbuild.git ../pgb
    pushd ../pgb

    mkdir /tmp/travistemp
    cp .travis.yml /tmp/travistemp
    mkdir /tmp/travistemp/scripts
    cp scripts/* /tmp/travistemp/scripts

    git checkout $TRAVIS_BRANCH

    rm -Rf assets build index.html templates www destkop

    if [ $TRAVIS_BRANCH == 'desktop' ] ; then
        cp -Rf ../$gitfolder/desktop ./
        cp -Rf ../$gitfolder/package.json ./
        cp -Rf ../$gitfolder/www ./
        rm -Rf www/assets/countries www/assets/mimetypes
    else
        cp -Rf ../$gitfolder/www/* ./
        rm -Rf assets/countries assets/mimetypes
    fi

    cp /tmp/travistemp/.travis.yml .travis.yml
    mkdir scripts
    cp /tmp/travistemp/scripts/* scripts


    git add .
    git commit -m "Travis build: $TRAVIS_BUILD_NUMBER"
    git push https://$GIT_TOKEN@github.com/$GIT_ORG/moodlemobile-phonegapbuild.git
    popd
fi

