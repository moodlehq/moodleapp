#!/bin/bash
source "scripts/functions.sh"

print_title "NPM packages list"

# List first level of installed libraries so we can check the installed versions.
npm list --depth=0

if [ "$TRAVIS_BRANCH" == 'master' ] && [ ! -z $GIT_TOKEN ] && [ "$TRAVIS_REPO_SLUG" == 'moodlehq/moodleapp' ]; then
    print_title "Update langpacks"
    cd scripts
    ./update_lang.sh
    cd ..

    print_title "Update generated lang files"
    git remote set-url origin https://$GIT_TOKEN@github.com/$TRAVIS_REPO_SLUG.git
    git fetch -q origin
    git add -A src/assets/lang
    git add */en.json
    git add src/config.json
    git commit -m 'Update lang files [ci skip]'
    git push origin HEAD:$TRAVIS_BRANCH
fi

print_title "AOT Compilation"
sed -ie $'s~throw new Error("No ResourceLoader.*~url = "templates/" + url;\\\nvar resolve;\\\nvar reject;\\\nvar promise = new Promise(function (res, rej) {\\\nresolve = res;\\\nreject = rej;\\\n});\\\nvar xhr = new XMLHttpRequest();\\\nxhr.open("GET", url, true);\\\nxhr.responseType = "text";\\\nxhr.onload = function () {\\\nvar response = xhr.response || xhr.responseText;\\\nvar status = xhr.status === 1223 ? 204 : xhr.status;\\\nif (status === 0) {\\\nstatus = response ? 200 : 0;\\\n}\\\nif (200 <= status \&\& status <= 300) {\\\nresolve(response);\\\n}\\\nelse {\\\nreject("Failed to load " + url);\\\n}\\\n};\\\nxhr.onerror = function () { reject("Failed to load " + url); };\\\nxhr.send();\\\nreturn promise;\\\n~g' node_modules/@angular/platform-browser-dynamic/esm5/platform-browser-dynamic.js
sed -ie "s/context\.isProd || hasArg('--minifyJs')/hasArg('--minifyJs')/g" node_modules/@ionic/app-scripts/dist/util/config.js
sed -ie "s/context\.isProd || hasArg('--optimizeJs')/hasArg('--optimizeJs')/g" node_modules/@ionic/app-scripts/dist/util/config.js
npm run ionic:build -- --prod


if [ $TRAVIS_BRANCH == 'integration' ] || [ $TRAVIS_BRANCH == 'master' ] || [ $TRAVIS_BRANCH == 'desktop' ] ; then
    if [ ! -z $GIT_ORG_PRIVATE ] && [ ! -z $GIT_TOKEN ] ; then
        if [ "$TRAVIS_REPO_SLUG" == 'moodlehq/moodleapp' ]; then
            print_title "Mirror repository"
            git remote add mirror https://$GIT_TOKEN@github.com/$GIT_ORG_PRIVATE/moodleapp.git
            git fetch -q mirror
            git push -f mirror HEAD:$TRAVIS_BRANCH
            git push mirror --tags
        else
            print_title "Run scripts"
            git clone --depth 1 https://$GIT_TOKEN@github.com/$GIT_ORG_PRIVATE/apps-scripts.git ../scripts
            cp ../scripts/build.sh scripts/
            ./scripts/build.sh
        fi
    fi
fi
