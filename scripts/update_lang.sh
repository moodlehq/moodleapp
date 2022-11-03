#!/bin/bash
#
# Script to update language packs on assets and detect new translated languages.
# ./update_lang.sh [language]
# If language is set it will only update the selected language.
# Edit lang_functions.sh LANGPACKSFOLDER variable to match your system's
#
source "functions.sh"
source "lang_functions.sh"

forceLang=$1

print_title 'Generating language from code...'
npx gulp lang

print_title 'Getting local mobile langs'
git clone --branch master --depth 1 https://github.com/moodlehq/moodle-local_moodlemobileapp.git ../../moodle-local_moodlemobileapp

if [ -z $forceLang ]; then
    get_languages
    php -f moodle_to_json.php
else
    get_language "$forceLang"
    php -f moodle_to_json.php "$forceLang"
fi

cp langindex.json ../../moodle-local_moodlemobileapp

print_ok 'All done!'
