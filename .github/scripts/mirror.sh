#!/bin/bash
source "./.github/scripts/functions.sh"

if [ -z $GIT_TOKEN ] || [ -z $GITHUB_REF_NAME ] || [ $GITHUB_REPOSITORY != 'moodlehq/moodleapp' ]; then
    print_error "Env vars not correctly defined"
    exit 1
fi

git remote add mirror https://$GIT_TOKEN@github.com/moodlemobile/moodleapp.git
git push -f mirror HEAD:$GITHUB_REF_NAME
notify_on_error_exit "MIRROR: Unsuccessful mirror, stopping..."
git push -f mirror --tags
notify_on_error_exit "MIRROR: Unsuccessful mirror tags, stopping..."
