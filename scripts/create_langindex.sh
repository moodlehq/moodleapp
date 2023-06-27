#!/bin/bash
#
# Script to create langindex from available language packs.
# ./create_langindex.sh [findbetter]
# If findbetter is set it will try to find a better solution for every key.
#


DIR="${BASH_SOURCE%/*}"
if [[ ! -d "$DIR" ]]; then DIR="$PWD"; fi

cd "$DIR"

source "functions.sh"
source "lang_functions.sh"
source "create_langindex_functions.sh"

print_title 'Generating language from code...'
npx gulp lang

get_english

print_title 'Processing file'
#Create langindex.json if not exists.
if [ ! -f 'langindex.json' ]; then
    echo "{}" > langindex.json
fi

findbetter=$1
parse_file "$findbetter"

echo

jq -S --indent 2 -s '.[0]' langindex.json > langindex_new.json
mv langindex_new.json langindex.json
rm langindex_old.json

print_ok 'All done!'
