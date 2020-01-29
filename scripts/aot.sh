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

    print_title "Update Licenses"
    npm install -g license-checker

    jq --version
    license-checker --json --production --relativeLicensePath > licenses.json
    jq 'del(.[].path)' licenses.json > licenses_old.json
    mv licenses_old.json licenses.json
    licenses=`jq -r 'keys[]' licenses.json`
    echo "{" > licensesurl.json
    first=1
    for license in $licenses; do
        obj=`jq --arg lic $license '.[$lic]' licenses.json`
        licensePath=`echo $obj | jq -r '.licenseFile'`
        file=""
        if [[ ! -z "$licensePath" ]] || [[ "$licensePath" != "null" ]]; then
            file=$(basename $licensePath)
            if [ $first -eq 1 ] ; then
                first=0
                echo "\"$license\" : { \"licenseFile\" : \"$file\"}" >> licensesurl.json
            else
                echo ",\"$license\" : { \"licenseFile\" : \"$file\"}" >> licensesurl.json
            fi
        fi
    done
    echo "}" >> licensesurl.json

    jq -s '.[0] * .[1]' licenses.json licensesurl.json > licenses_old.json
    mv licenses_old.json licenses.json
    rm licensesurl.json

    git add licenses.json
    git commit -m 'Update licenses [ci skip]'

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
