#!/bin/bash
#
# Functions to update langpacks.
#

APPMODULENAME='local_moodlemobileapp'

TOTAL_STRINGS=0
LANGINDEX_STRINGS=0

LANGPACKS_PATH='/tmp/moodleapp-lang'

function progressbar {
    let _progress=(${1}*100/100*100)/100
    let _done=(${_progress}*4)/10
    let _left=40-$_done
    _fill=$(printf "%${_done}s")
    _empty=$(printf "%${_left}s")
    bar=`printf "[${_fill// /#}${_empty// /-}] ${_progress}%%"`
}

# Copy language file
function copy_lang {
    lang=$1

    index_keys=$(jq -r 'to_entries[] | "\"\(.key)\","' langindex.json)
    index_keys=${index_keys:0:${#index_keys}-1}

    hyphenlang=${lang/_/-}
    langfilepath=$LANG_PATH/$hyphenlang.json
    cp "$LANGPACKS_PATH"/"$lang".json "$langfilepath"

    # Merge SUFFIX file if exists.
    if [ -n "$SUFFIX" ] && [ -f "$LANGPACKS_PATH/${lang}_${SUFFIX}.json" ]; then
        suffixfilepath="$LANGPACKS_PATH/${lang}_${SUFFIX}.json"
        jq --indent 4 -s --sort-keys ".[0] + .[1]" "$langfilepath" "$suffixfilepath"  > /tmp/moodle-langtmp.json
        mv /tmp/moodle-langtmp.json "$langfilepath"
    fi


    # Remove strings non exiting on langindex.
    query="with_entries(select([.key] | inside([$index_keys])))"
    jq --indent 2 -r "$query" "$langfilepath" > /tmp/moodle-langtmp.json
    mv /tmp/moodle-langtmp.json "$langfilepath"

    name=$(jq -r .\""$lang"\".name "$LANGPACKS_PATH"/languages.json)
    local=$(jq -r .\""$lang"\".local "$LANGPACKS_PATH"/languages.json)
    translated=$(jq -r '. | length' "$langfilepath")
    percentage=$(echo "($translated * 100) /$LANGINDEX_STRINGS" | bc)
    progressbar "$percentage"
    echo -e "Generated $hyphenlang\t $translated of $LANGINDEX_STRINGS\t $bar ($local local)"


    # Add or update language name to config.
    newlang="{\"$hyphenlang\": \"$name\"}"
    languages=$(jq -s --sort-keys ".[0].languages + $newlang" ../moodle.config.json)
    jq --indent 4 -s ".[0].languages = $languages | .[0]" ../moodle.config.json > /tmp/moodle-langtmp.json
    mv /tmp/moodle-langtmp.json ../moodle.config.json
}

function detect_lang {
    lang=$1

    name=$(jq -r .\""$lang"\".name "$LANGPACKS_PATH"/languages.json)
    if [ -z "$name" ] || [ "$name" == 'null' ]; then
        return
    fi

    hyphenlang=${lang/_/-}
    if [ -f "$LANG_PATH"/"$hyphenlang".json ]; then
        # Already exists
        return
    fi

    local=$(jq -r .\""$lang"\".local "$LANGPACKS_PATH"/languages.json)
    translated=$(jq -r .\""$lang"\".translated "$LANGPACKS_PATH"/languages.json)
    percentage=$(echo "($translated * 100) /$TOTAL_STRINGS" | bc)
    progressbar "$percentage"
    echo -e "Checking $lang\t $translated of $TOTAL_STRINGS \t $bar ($local local)";

    if [[ ( $percentage -gt 75 && $local -gt 50 ) || ( $percentage -gt 50  && $local -gt 75 ) ]] ; then
        name=$(jq -r .\""$lang"\".name "$LANGPACKS_PATH"/languages.json)
        echo "*** NEW LANGUAGE DETECTED $lang - $name ***"

        copy_lang "$lang"
    fi
}

function load_langpacks {
    get_app_version

    print_title 'Getting local mobile langs'
    if [ -d  "$LANGPACKS_PATH" ]; then
        pushd "$LANGPACKS_PATH"

        git checkout "langpack_$LANGVERSION"
        if [ $? -ne 0 ]; then
            echo "Cannot checkout language repository langpack_$LANGVERSION"
            exit 1
        fi

        git pull
        if [ $? -ne 0 ]; then
            echo "Cannot update language repository"
            exit 1
        fi

        popd
    else
        git clone --depth 1 --single-branch --branch "langpack_$LANGVERSION" https://github.com/moodlehq/moodle-local_moodlemobileapp.git "$LANGPACKS_PATH"
         if [ $? -ne 0 ]; then
            echo "Cannot clone language repository"
            exit 1
        fi
    fi

    local_strings=$(jq -r '.languages.local' "$LANGPACKS_PATH"/languages.json)
    TOTAL_STRINGS=$(jq -r '.languages.total' "$LANGPACKS_PATH"/languages.json)
    LANGINDEX_STRINGS=$(jq -r '. | length' langindex.json)

    print_message "Total strings to translate $TOTAL_STRINGS ($local_strings local)";
}

# Entry function to get all language files.
function get_languages {
    print_title 'Copying existing languages'
    # Existing languages, copy and clean the files.
    langs=$(jq -r '.languages | keys[]' ../moodle.config.json)
    for lang in $langs; do
        lang=${lang//-/_}
        copy_lang "$lang"
    done
}

# Entry function to detect new languages.
function detect_languages {
    # Do not detect new langs when suffix is set.
    if [ -n "$SUFFIX" ]; then
        return
    fi

    print_title "Detect new languages"
    langs=$(jq -r 'keys[]' "$LANGPACKS_PATH"/languages.json)
    for lang in $langs; do
        if  [[ $lang = *_wp ]]; then
            # Skip Workplace.
            continue
        fi

        detect_lang "$lang"
    done
}

# Entry function to generate translation module file.
function generate_local_module_file {
    if [ ! -d "../../moodle-$APPMODULENAME" ]; then
        print_error "Module $APPMODULENAME directory does not exists, skipping..."
        return
    fi

    print_title "Generating $APPMODULENAME..."

    gulp

    module_translations=''

    keys=$(jq -r 'map_values(select(contains("local_moodlemobileapp"))) | keys[]' langindex.json)
    for key in $keys; do
        # Check if already parsed.
        translation=$(jq -r .\""$key"\" "$LANG_PATH"/en.json)
        if [ -z "$translation" ] || [ "$translation" == 'null' ]; then
            echo "Key $key not translated!"
            continue
        fi
        translation="${translation//\'/\\\'}"
        module_translations="$module_translations\$string['$key'] = '$translation';\n";
    done

    if [ -z "$module_translations" ]; then
        print_error "ERROR, translations not found, you probably didn't run gulp lang!";
        return
    fi

    echo -e "$module_translations" > /tmp/translations.php

    filepath="../../moodle-$APPMODULENAME/lang/en/$APPMODULENAME.php";

    BEGIN_GEN=$(cat $filepath | grep -n '\/\* AUTO START \*\/' | sed 's/\(.*\):.*/\1/g')
    END_GEN=$(cat $filepath | grep -n '\/\* AUTO END \*\/' | sed 's/\(.*\):.*/\1/g')
    cat <(head -n "$BEGIN_GEN" $filepath) /tmp/translations.php <(tail -n +"$END_GEN" $filepath) > /tmp/translations_temp.php
    mv /tmp/translations_temp.php $filepath

    cp langindex.json ../../moodle-$APPMODULENAME
}
