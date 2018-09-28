#!/bin/bash
source "functions.sh"
forceLang=$1

print_title 'Getting languages'
git clone https://git.in.moodle.com/moodle/moodle-langpacks.git $LANGPACKSFOLDER
pushd $LANGPACKSFOLDER
git checkout MOODLE_36_STABLE
git pull
popd

if [ -z $forceLang ]; then
    php -f moodle_to_json.php
else
    php -f moodle_to_json.php "$forceLang"
fi

print_ok 'All done!'