#!/bin/bash
source "./.github/scripts/functions.sh"
BRANCH=${GITHUB_REF##*/}

if [ -z $GIT_TOKEN ] || [ -z $BRANCH ] || [ $GITHUB_REPOSITORY != 'moodlehq/moodleapp' ]; then
    print_error "Env vars not correctly defined"
    exit 1
fi

git remote add mirror https://$GIT_TOKEN@github.com/moodlemobile/moodleapp.git
git push -f mirror HEAD:$BRANCH
notify_on_error_exit "MIRROR: Unsuccessful mirror, stopping..."
git push -f mirror --tags
notify_on_error_exit "MIRROR: Unsuccessful mirror tags, stopping..."
