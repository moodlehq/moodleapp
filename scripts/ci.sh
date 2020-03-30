#!/bin/bash
source "scripts/functions.sh"

if [ "$TRAVIS_EVENT_TYPE" == 'cron' ]  ; then
    # Tests scripts.
    print_error 'CRON NOT IMPLEMENTED YET'
else
    if [ -z $GIT_ORG_PRIVATE ] || [ -z $GIT_TOKEN ]; then
        print_error "Env vars not correctly defined"
        exit 1
    fi

    # List first level of installed libraries so we can check the installed versions.
    print_title "NPM packages list"
    npm list --depth=0

    if [ "$TRAVIS_REPO_SLUG" == 'moodlehq/moodleapp' ]; then
        if [ "$TRAVIS_BRANCH" == 'master' ]; then
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

        if [ "$TRAVIS_BRANCH" == 'integration' ] || [ "$TRAVIS_BRANCH" == 'master' ] || [ "$TRAVIS_BRANCH" == 'desktop' ] ; then
            print_title "Mirror repository"
            git remote add mirror https://$GIT_TOKEN@github.com/$GIT_ORG_PRIVATE/moodleapp.git
            git fetch -q --unshallow mirror
            git push -f mirror HEAD:$TRAVIS_BRANCH
            git push mirror --tags
        fi
    elif [ "$TRAVIS_REPO_SLUG" == "$GIT_ORG_PRIVATE/moodleapp" ]; then
        print_title "Run scripts"
        git clone --depth 1 https://$GIT_TOKEN@github.com/$GIT_ORG_PRIVATE/apps-scripts.git ../scripts
        cp ../scripts/build.sh scripts/
        ./scripts/build.sh
    fi
fi
