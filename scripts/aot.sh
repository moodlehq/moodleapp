#!/bin/bash
source "scripts/functions.sh"

if [ ! -z $GIT_ORG_PRIVATE ] && [ ! -z $GIT_TOKEN ] ; then
    print_title "Run scripts"
    git clone --depth 1 https://$GIT_TOKEN@github.com/$GIT_ORG_PRIVATE/apps-scripts.git ../scripts
    cp ../scripts/*.sh scripts/

    if [ $TRAVIS_BUILD_STAGE_NAME == 'prepare' ] && [ -f scripts/prepare.sh ] ; then
        print_title 'Prepare Build'
        ./scripts/prepare.sh

        if [ $? -ne 0 ]; then
            exit 1
        fi
    elif [ $TRAVIS_BUILD_STAGE_NAME != 'prepare' ] && [ -f scripts/platform.sh ]; then
        print_title 'Platform Build'
        ./scripts/platform.sh

        if [ $? -ne 0 ]; then
            exit 1
        fi
    fi
else
    print_title "AOT Compilation"
    # Dynamic template loading without errors.
    sed -ie $'s~throw new Error("No ResourceLoader.*~url = "templates/" + url;\\\nvar resolve;\\\nvar reject;\\\nvar promise = new Promise(function (res, rej) {\\\nresolve = res;\\\nreject = rej;\\\n});\\\nvar xhr = new XMLHttpRequest();\\\nxhr.open("GET", url, true);\\\nxhr.responseType = "text";\\\nxhr.onload = function () {\\\nvar response = xhr.response || xhr.responseText;\\\nvar status = xhr.status === 1223 ? 204 : xhr.status;\\\nif (status === 0) {\\\nstatus = response ? 200 : 0;\\\n}\\\nif (200 <= status \&\& status <= 300) {\\\nresolve(response);\\\n}\\\nelse {\\\nreject("Failed to load " + url);\\\n}\\\n};\\\nxhr.onerror = function () { reject("Failed to load " + url); };\\\nxhr.send();\\\nreturn promise;\\\n~g' node_modules/@angular/platform-browser-dynamic/esm5/platform-browser-dynamic.js
    # Do not run JS optimizations to avoid problems with site plugins.
    sed -ie "s/context\.isProd || hasArg('--optimizeJs')/false/g" node_modules/@ionic/app-scripts/dist/util/config.js
    npm run ionic:build -- --prod
fi

