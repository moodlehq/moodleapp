#!/bin/bash
source "functions.sh"

#Saves or updates a key on langindex_old.json
function save_key {
    key=$1
    found=$2

    print_ok "$key=$found"
    echo "{\"$key\": \"$found\"}" > langindex_old.json
    jq -s '.[0] + .[1]' langindex.json langindex_old.json > langindex_new.json
    mv langindex_new.json langindex.json
}

#Removes a key on langindex_old.json
function remove_key {
    key=$1
    found=$2

    print_ok "$key=$found"
    echo "{\"$key\": \"$found\"}" > langindex_old.json
    jq -s '.[0] - .[1]' langindex.json langindex_old.json > langindex_new.json
    mv langindex_new.json langindex.json
}

#Check if and i exists in php file
function exists_in_file {
    file=$1
    id=$2

    file=`echo $file | sed s/^mod_workshop_assessment/workshopform/1`
    file=`echo $file | sed s/^mod_assign_/assign/1`
    file=`echo $file | sed s/^mod_//1`

    completeFile="$LANGPACKSFOLDER/en/$file.php"
    if [ -f "$completeFile" ]; then
        coincidence=`grep "string\[\'$id\'\]" $completeFile`
        if [ ! -z "$coincidence" ]; then
            found=$file
            return
        fi
    fi
    found=0
}

#Checks if a key exists on the original local_moodlemobileapp.php
function exists_in_mobile {
    file='local_moodlemobileapp'
    exists_in_file $file $key
}

function do_match {
    match=$1
    filematch=""

    coincidence=`grep "$match" $LANGPACKSFOLDER/en/*.php | wc -l`
    if [ $coincidence -eq 1 ]; then
        filematch=`grep "$match" $LANGPACKSFOLDER/en/*.php | cut -d'/' -f5 | cut -d'.' -f1`
        exists_in_file $filematch $plainid
    elif [ $coincidence -gt 0 ] && [ "$#" -gt 1 ]; then
        print_message $2
        tput setaf 6
        grep "$match" $LANGPACKSFOLDER/en/*.php
    fi
}

#Find if the id or the value can be found on files to help providing a solution.
function find_matches {
    do_match "string\[\'$plainid\'\] = \'$value\'" "Found EXACT match for $key in the following paths"
    if [ $coincidence -gt 0 ]; then
        case=1
        return
    fi

    do_match " = \'$value\'" "Found some string VALUES for $key in the following paths"
    if [ $coincidence -gt 0 ]; then
        case=2
        return
    fi

    do_match "string\[\'$plainid\'\]" "Found some string KEYS for $key in the following paths, value $value"
    if [ $coincidence -gt 0 ]; then
        case=3
        return
    fi

    print_message "No match found for $key add it to local_moodlemobileapp"
    save_key $key "local_moodlemobileapp"
}

function find_single_matches {
    do_match "string\[\'$plainid\'\] = \'$value\'"
    if [ ! -z $filematch ] && [ $found != 0 ]; then
        case=1
        return
    fi

    do_match " = \'$value\'"
    if [ ! -z $filematch ] && [ $filematch != 'local_moodlemobileapp' ]; then
        case=2
        print_message "Found some string VALUES for $key in the following paths $filematch"
        tput setaf 6
        grep "$match" $LANGPACKSFOLDER/en/*.php
        return
    fi

    do_match "string\[\'$plainid\'\]"
    if [ ! -z $filematch ] && [ $found != 0 ]; then
        case=3
        return
    fi
}


#Tries to gues the file where the id will be found.
function guess_file {
    key=$1
    value=$2

    type=`echo $key | cut -d'.' -f1`
    component=`echo $key | cut -d'.' -f2`
    plainid=`echo $key | cut -d'.' -f3-`

    if [ -z "$plainid" ]; then
        plainid=$component
        component='moodle'
    fi

    exists_in_file $component $plainid

    if [ $found == 0 ]; then
        tempid=`echo $plainid | sed s/^mod_//1`
        if [ $component == 'moodle' ] && [ "$tempid" != "$plainid" ]; then
            exists_in_file $plainid pluginname

            if [ $found != 0 ]; then
                found=$found/pluginname
            fi
        fi
    fi

    # Not found in file, try in local_moodlemobileapp
    if [ $found == 0 ]; then
        exists_in_mobile
    fi

    # Still not found, if only found in one file, use it.
    if [ $found == 0 ]; then
        find_single_matches
    fi

    # Last fallback.
    if [ $found == 0 ]; then
        exists_in_file 'moodle' $plainid
    fi

    if [ $found == 0 ]; then
        find_matches
    else
        save_key $key $found
    fi
}

#Finds if there's a better file where to get the id from.
function find_better_file {
    key=$1
    value=$2
    current=$3

    type=`echo $key | cut -d'.' -f1`
    component=`echo $key | cut -d'.' -f2`
    plainid=`echo $key | cut -d'.' -f3-`

    if [ -z "$plainid" ]; then
        plainid=$component
        component='moodle'
    fi

    currentFile=`echo $current | cut -d'/' -f1`
    currentStr=`echo $current | cut -d'/' -f2-`
    if [ $currentFile == $current ]; then
        currentStr=$plainid
    fi

    exists_in_file $component $plainid
    if [ $found != 0 ] && [ $currentStr == $plainid ]; then
        if [ $found != $currentFile ]; then
            print_ok "Key '$key' found in component, no need to replace old '$current'"
        fi

        return
    fi

    # Still not found, if only found in one file, use it.
    if [ $found == 0 ]; then
        find_single_matches
    fi

    if [ $found != 0 ] && [ $found != $currentFile ] && [ $case -lt 3 ]; then
        print_message "Indexed string '$key' found in '$found' better than '$current'"
        return
    fi

    if [ $currentFile == 'local_moodlemobileapp' ]; then
        exists_in_mobile
    else
        exists_in_file $currentFile $currentStr
    fi

    if [ $found == 0 ]; then
        print_error "Indexed string '$key' not found on current place '$current'"
        if [ $currentFile != 'local_moodlemobileapp' ]; then
            print_error "Execute this on AMOS
            CPY [$currentStr,$currentFile],[$key,local_moodlemobileapp]"
            save_key $key "local_moodlemobileapp"
        fi
    fi
}

#Parses the file.
function parse_file {
    findbetter=$2
    keys=`jq -r 'keys[]' $1`
    for key in $keys; do
        # Check if already parsed.
        exec="jq -r .\"$key\" langindex.json"
        found=`$exec`

        exec="jq -r .\"$key\" $1"
        value=`$exec`
        if [ -z "$found" ] || [ "$found" == 'null' ]; then
            guess_file $key "$value"
        elif [ ! -z "$findbetter" ]; then
            find_better_file "$key" "$value" "$found"
        fi
    done
}

print_title 'Generating language from code...'
gulp lang

print_title 'Getting languages'
git clone https://git.in.moodle.com/moodle/moodle-langpacks.git $LANGPACKSFOLDER
pushd $LANGPACKSFOLDER
BRANCHES=($(git branch -r --format="%(refname:lstrip=3)" --sort="refname" | grep MOODLE_))
BRANCH=${BRANCHES[${#BRANCHES[@]}-1]}
git checkout $BRANCH
git pull
popd

print_title 'Processing file'
#Create langindex.json if not exists.
if [ ! -f 'langindex.json' ]; then
    echo "{}" > langindex.json
fi

findbetter=$1
parse_file '../src/assets/lang/en.json' $findbetter

echo

jq -S --indent 2 -s '.[0]' langindex.json > langindex_new.json
mv langindex_new.json langindex.json
rm langindex_old.json

print_ok 'All done!'