#!/bin/bash

# Compile AOT.
if [ $TRAVIS_BRANCH == 'integration' ] || [ $TRAVIS_BRANCH == 'master' ] || [ -z $TRAVIS_BRANCH ] ; then
    sed -ie $'s~throw new Error("No ResourceLoader.*~url = "templates/" + url;\\\nvar resolve;\\\nvar reject;\\\nvar promise = new Promise(function (res, rej) {\\\nresolve = res;\\\nreject = rej;\\\n});\\\nvar xhr = new XMLHttpRequest();\\\nxhr.open("GET", url, true);\\\nxhr.responseType = "text";\\\nxhr.onload = function () {\\\nvar response = xhr.response || xhr.responseText;\\\nvar status = xhr.status === 1223 ? 204 : xhr.status;\\\nif (status === 0) {\\\nstatus = response ? 200 : 0;\\\n}\\\nif (200 <= status \&\& status <= 300) {\\\nresolve(response);\\\n}\\\nelse {\\\nreject("Failed to load " + url);\\\n}\\\n};\\\nxhr.onerror = function () { reject("Failed to load " + url); };\\\nxhr.send();\\\nreturn promise;\\\n~g' node_modules/@angular/platform-browser-dynamic/esm5/platform-browser-dynamic.js
    sed -ie "s/context\.isProd || hasArg('--minifyJs')/hasArg('--minifyJs')/g" node_modules/@ionic/app-scripts/dist/util/config.js
    sed -ie "s/context\.isProd || hasArg('--optimizeJs')/hasArg('--optimizeJs')/g" node_modules/@ionic/app-scripts/dist/util/config.js
    npm run ionic:build -- --prod
fi

# Copy to PGB git (only on a configured travis build).
if [ ! -z $GIT_ORG ] && [ ! -z $GIT_TOKEN ] ; then
    gitfolder=${PWD##*/}
    cd ..
    git clone https://github.com/$GIT_ORG/moodlemobile-phonegapbuild.git pgb
    cd pgb
    git checkout $TRAVIS_BRANCH
    rm -Rf assets build index.html templates
    cp -Rf ../$gitfolder/www/* ./
    git add .
    git commit -m "Travis build: $TRAVIS_BUILD_NUMBER"
    git push https://$GIT_TOKEN@github.com/$GIT_ORG/moodlemobile-phonegapbuild.git
fi
