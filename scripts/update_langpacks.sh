#!/bin/bash
#
# Script to update language packs on assets and detect new translated languages.
# ./update_langpacks.sh [detect]
#
# When detect is present, it will check other languages not included in moodle.config.json to be included in the build.
# It will alo generate the local module files and override the current lang.json on the src folder.
#

DIR="${BASH_SOURCE%/*}"
if [[ ! -d "$DIR" ]]; then DIR="$PWD"; fi

cd "$DIR"

source "functions.sh"
source "lang_functions.sh"
source "update_lang_functions.sh"

load_langpacks

get_languages

if [[ -z $1 ]]; then
    print_ok 'All done!'
    exit 0
fi

# Detect new languages and copy langindex to the translations folder.

detect_languages

gulp lang-override

generate_local_module_file

print_ok 'All done!'
