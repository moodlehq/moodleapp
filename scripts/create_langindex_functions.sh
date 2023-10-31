#!/bin/bash
#
# Functions used to create langidex.
#

SERVER_URL='https://packaging.moodle.org/'

LANGPACKS_PATH='/tmp/moodle-lang'

# Downloads a file and if it's a zip file, unzip it.
function download_file {
    local url=$1
    local filename=$(basename "${url}")

    pushd "$LANGPACKS_PATH" > /dev/null

    curl -L -s "$url" --output "$filename" > /dev/null
    size=$(du -k "$filename" | cut -f 1)
    if [ ! -n "$filename" ] || [ "$size" -le 1 ]; then
        echo "Wrong or corrupt file $filename"
        rm "$filename"

        popd > /dev/null
        return
    fi

    if [[ $filename == *.zip ]]; then
        local lang="${filename%.*}"
        # Delete previous downloaded folder
        rm -R "$lang" > /dev/null 2>&1> /dev/null

        # Unzip
        unzip -o -u "$lang".zip > /dev/null

        # Delete the zip
        rm "$filename"
    fi

    popd > /dev/null
}

function get_english {
    if [ ! -d "$LANGPACKS_PATH" ]; then
        mkdir "$LANGPACKS_PATH"
    fi

    get_app_version

    echo "Getting English language..."
    download_file "$SERVER_URL/langpack/$LANGVERSION/en.zip"
}

#Saves or updates a key on langindex_old.json
function save_key {
    local key=$1
    local found=$2

    print_ok "$key=$found"
    echo "{\"$key\": \"$found\"}" > langindex_old.json
    jq -s '.[0] + .[1]' langindex.json langindex_old.json > langindex_new.json
    mv langindex_new.json langindex.json
}

#Removes a key on langindex_old.json
function remove_key {
    local key=$1

    cat langindex.json | jq 'del(."'"$key"'")' > langindex_new.json
    mv langindex_new.json langindex.json
    print_ok "Deleted unused key $key"
}

#Check if a lang id exists in php file
function exists_in_file {
    local file=$1
    local id=$2

    file=$(echo "$file" | sed s/^mod_workshop_assessment/workshopform/1)
    file=$(echo "$file" | sed s/^mod_assign_/assign/1)
    file=$(echo "$file" | sed s/^mod_//1)

    completeFile="$LANGPACKS_PATH/en/$file.php"
    if [ -f "$completeFile" ]; then
        foundInFile=$(grep "string\['${id}'\]" "${completeFile}")
        if [ -n "$foundInFile" ]; then
            coincidence=1
            found=$file
            return
        fi
    fi
    coincidence=0
    found=0
}

#Checks if a key exists on the original local_moodlemobileapp.php
function exists_in_mobile {
    local file='local_moodlemobileapp'
    exists_in_file $file "$key"
}

function do_match {
    match=${1/\{\{/\{}
    match=${match/\}\}/\}}
    filematch=""

    coincidence=$(grep "$match" "$LANGPACKS_PATH"/en/*.php | wc -l)
    if [ "$coincidence" -eq 1 ]; then
        filematch=$(grep "$match" "$LANGPACKS_PATH"/en/*.php | cut -d'/' -f5 | cut -d'.' -f1)
        exists_in_file "$filematch" "$plainid"
    elif [ "$coincidence" -gt 0 ] && [ "$#" -gt 1 ]; then
        print_message "$2"
        tput setaf 6
        grep "$match" "$LANGPACKS_PATH"/en/*.php
    else
        coincidence=0
    fi
}

#Find if the id or the value can be found on files to help providing a solution.
function find_matches {
    do_match "string\[\'$plainid\'\] = \'$value\'" "Found EXACT match for $key in the following paths"
    if [ "$coincidence" -gt 0 ]; then
        case=1
        save_key "$key" "TBD"
        return
    fi

    do_match " = \'$value\'" "Found some string VALUES for $key in the following paths"
    if [ "$coincidence" -gt 0 ]; then
        case=2
        save_key "$key" "TBD"
        return
    fi

    do_match "string\[\'$plainid\'\]" "Found some string KEYS for $key in the following paths, value $value"
    if [ "$coincidence" -gt 0 ]; then
        case=3
        save_key "$key" "TBD"
        return
    fi

    print_message "No match found for $key add it to local_moodlemobileapp"
    save_key "$key" "local_moodlemobileapp"
}

function find_single_matches {
    do_match "string\[\'$plainid\'\] = \'$value\'"
    if [ -n "$filematch" ] && [ "$found" != 0 ]; then
        case=1
        return
    fi

    do_match " = \'$value\'"
    if [ -n "$filematch" ] && [ "$filematch" != 'local_moodlemobileapp' ]; then
        case=2
        print_message "Found some string VALUES for $key in the following paths $filematch"
        tput setaf 6
        grep "$match" "$LANGPACKS_PATH"/en/*.php
        return
    fi

    do_match "string\[\'$plainid\'\]"
    if [ -n "$filematch" ] && [ "$found" != 0 ]; then
        case=3
        return
    fi
}


#Tries to gues the file where the id will be found.
function guess_file {
    local key=$1
    local value=$2

    local type=$(echo "$key" | cut -d'.' -f1)
    local component=$(echo "$key" | cut -d'.' -f2)
    local plainid=$(echo "$key" | cut -d'.' -f3-)

    if [ -z "$plainid" ]; then
        plainid=$component
        component='moodle'
    fi

    exists_in_file "$component" "$plainid"

    if [ "$found" == 0 ]; then
        tempid=$(echo "$plainid" | sed s/^mod_//1)
        if [ "$component" == 'moodle' ] && [ "$tempid" != "$plainid" ]; then
            exists_in_file "$plainid" pluginname

            if [ "$found" != 0 ]; then
                found=$found/pluginname
            fi
        fi
    fi

    # Not found in file, try in local_moodlemobileapp
    if [ "$found" == 0 ]; then
        exists_in_mobile
    fi

    # Still not found, if only found in one file, use it.
    if [ "$found" == 0 ]; then
        find_single_matches
    fi

    # Last fallback.
    if [ "$found" == 0 ]; then
        exists_in_file 'moodle' "$plainid"
    fi

    if [ "$found" == 0 ]; then
        find_matches
    else
        save_key "$key" "$found"
    fi
}

function current_translation_exists {
    local key=$1
    local current=$2
    local file=$3

    plainid=$(echo "$key" | cut -d'.' -f3-)

    if [ -z "$plainid" ]; then
        plainid=$(echo "$key" | cut -d'.' -f2)
    fi

    local currentFile=$(echo "$current" | cut -d'/' -f1)
    local currentStr=$(echo "$current" | cut -d'/' -f2-)
    if [ "$currentFile" == "$current" ]; then
        currentStr=$plainid
    fi

    exists_in_file "$currentFile" "$currentStr"
    if [ "$found" == 0 ]; then
        # Translation not found.
        exec="jq -r .\"$key\" $file"

        value=$($exec)

        found=$($exec)
        print_error "Translation of '$currentStr' not found in '$currentFile'"

        guess_file "$key" "$value"
    fi
}

#Finds if there's a better file where to get the id from.
function find_better_file {
    local key=$1
    local value=$2
    local current=$3

    local type=$(echo "$key" | cut -d'.' -f1)
    local component=$(echo "$key" | cut -d'.' -f2)
    local plainid=$(echo "$key" | cut -d'.' -f3-)

    if [ -z "$plainid" ]; then
        plainid=$component
        component='moodle'
    fi

    local currentFile=$(echo "$current" | cut -d'/' -f1)
    local currentStr=$(echo "$current" | cut -d'/' -f2-)
    if [ "$currentFile" == "$current" ]; then
        currentStr=$plainid
    fi

    exists_in_file "$component" "$plainid"
    if [ "$found" != 0 ] && [ "$currentStr" == "$plainid" ]; then
        if [ "$found" != "$currentFile" ]; then
            print_ok "Key '$key' found in component, no need to replace old '$current'"
        fi

        return
    fi

    # Still not found, if only found in one file, use it.
    if [ "$found" == 0 ]; then
        find_single_matches
    fi

    if [ "$found" != 0 ] && [ "$found" != "$currentFile" ] && [ "$case" -lt 3 ]; then
        print_message "Indexed string '$key' found in '$found' better than '$current'"
        return
    fi

    if [ "$currentFile" == 'local_moodlemobileapp' ]; then
        exists_in_mobile
    else
        exists_in_file "$currentFile" "$currentStr"
    fi

    if [ "$found" == 0 ]; then
        print_error "Indexed string '$key' not found on current place '$current'"
        if [ "$currentFile" != 'local_moodlemobileapp' ]; then
            print_error "Execute this on AMOS
            CPY [$currentStr,$currentFile],[$key,local_moodlemobileapp]"
            save_key "$key" "local_moodlemobileapp"
        fi
    fi
}

# Parses the file.
function parse_file {
    file="$LANG_PATH/en.json"
    findbetter=$1

    keys=$(jq -r 'keys[]' "$file")
    for key in $keys; do
        echo -n '.'
        # Check if already parsed.
        exec="jq -r .\"$key\" langindex.json"
        found=$($exec)

        if [ -z "$found" ] || [ "$found" == 'null' ]; then

            exec="jq -r .\"$key\" $file"
            value=$($exec)
            guess_file "$key" "$value"
        else
            if [ "$found" == 'donottranslate' ]; then
                # Do nothing since is not translatable.
                continue
            elif [ -n "$findbetter" ]; then
                exec="jq -r .\"$key\" $file"
                value=$($exec)
                find_better_file "$key" "$value" "$found"
            elif [ "$found" != 'local_moodlemobileapp' ]; then
                current_translation_exists "$key" "$found" "$file"
            fi
        fi
    done

    # Do some cleanup
    langkeys=$(jq -r 'keys[]' langindex.json)
    findkeys="${keys[@]}"
    for key in $langkeys; do
        # Check if already used.
        array_contains "$key" "$findkeys"

        if [ -z "$found" ] || [ "$found" == 'null' ]; then
            remove_key "$key"
        fi
    done
}

# Checks if an array contains an string.
function array_contains {
    local hayjack=$2
    local needle=$1
    found=''
    for i in $hayjack; do
        if [ "$i" == "$needle" ] ; then
            found=$i
            return
        fi
    done
}
