#!/bin/bash
source "functions.sh"
forceLang=$1

print_title 'Getting languages'
git clone --depth 1 --no-single-branch https://git.in.moodle.com/moodle/moodle-langpacks.git $LANGPACKSFOLDER
pushd $LANGPACKSFOLDER
BRANCHES=($(git branch -r --format="%(refname:lstrip=3)" --sort="refname" | grep MOODLE_))
BRANCH=${BRANCHES[${#BRANCHES[@]}-1]}
git checkout $BRANCH
git pull
popd

print_title 'Getting local mobile langs'
git clone --depth 1 https://github.com/moodlehq/moodle-local_moodlemobileapp.git ../../moodle-local_moodlemobileapp

if [ -z $forceLang ]; then
    php -f moodle_to_json.php
else
    php -f moodle_to_json.php "$forceLang"
fi

print_ok 'All done!'