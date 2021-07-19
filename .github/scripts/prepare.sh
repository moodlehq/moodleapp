#!/bin/bash
source "./.github/scripts/functions.sh"

if [ -z $GIT_TOKEN ] || [ $GITHUB_REPOSITORY != 'moodlemobile/moodleapp' ]; then
    print_error "Env vars not correctly defined"
    exit 1
fi

print_title "Run prepare scripts"
# TODO Change branch name.
git clone --depth 1 --single-branch --branch ionic5 https://$GIT_TOKEN@github.com/moodlemobile/apps-scripts.git ../scripts
cp ../scripts/*.sh scripts/

if [ ! -f scripts/prepare.sh ]; then
    print_error "Prepare file not found"
    exit 1
fi

print_title 'Prepare Build'
./scripts/prepare.sh

if [ $? -ne 0 ]; then
    exit 1
fi
