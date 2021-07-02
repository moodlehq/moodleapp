#!/bin/bash
#
# Functions to fetch languages.
#

LANGPACKSFOLDER='../../moodle-langpacks'
BUCKET='moodle-lang-prod'
MOODLEORG_URL='https://download.moodle.org/download.php/direct/langpack'
DEFAULT_LASTVERSION='4.0'

# Checks if AWS is available and configured.
function check_aws {
    AWS_SERVICE=1

    aws --version &> /dev/null
    if [ $? -ne 0 ]; then
        AWS_SERVICE=0
        echo 'AWS not installed. Check https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html for more info.'
        return
    fi

    # In order to login to AWS, use credentials file or AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY vars.
    if [ ! -f ~/.aws/credentials ] && ([ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]); then
        AWS_SERVICE=0
        lastversion=$DEFAULT_LASTVERSION
        echo 'AWS Cannot authenticate. Use aws configure or set the proper env vars.'
        return
    fi
}

# Get last version of Moodle to fetch latest languages.
function get_last_version {
    if [ ! -z "${lastversion}" ]; then
        return
    fi

    check_aws
    if [ $AWS_SERVICE -eq 0 ]; then
        lastversion=$DEFAULT_LASTVERSION
        echo "Using default version $lastversion"
        return
    fi

    list=`aws s3 ls s3://$BUCKET/`
    if [ $? -ne 0 ]; then
        AWS_SERVICE=0
        lastversion=$DEFAULT_LASTVERSION
        echo "AWS Cannot authenticate. Using default version $lastversion"
        return
    fi

    lastversion=''
    for folder in $list; do
        if [ $folder != 'PRE' ]; then
            lastversion=${folder/\//}
        fi
    done

    if [ ! -z "${lastversion}" ]; then
        echo "Last version $lastversion detected"
        return
    fi

    lastversion=$DEFAULT_LASTVERSION
}

# Create langfolder
function create_langfolder {
    if [ ! -d $LANGPACKSFOLDER ]; then
        mkdir $LANGPACKSFOLDER
    fi
}

# Get all language list from AWS.
function get_all_languages_aws {
    langsfiles=`aws s3 ls s3://$BUCKET/$lastversion/`
    langs=""
    for file in $langsfiles; do
        if [[ "$file" == *.zip ]]; then
            file=${file/\.zip/}
            langs+="$file "
        fi
    done
}

# Get language list from the installed ones (will not discover new translations).
function get_installed_languages {
    langs=`jq -r '.languages | keys[]' ../moodle.config.json`
}

# Entry function to get a language file.
function get_language {
    lang=$1
    lang=${lang/-/_}

    get_last_version

    create_langfolder

    echo "Getting $lang language"

    pushd $LANGPACKSFOLDER > /dev/null

    curl -s $MOODLEORG_URL/$lastversion/$lang.zip --output $lang.zip > /dev/null
    rm -R $lang > /dev/null 2>&1> /dev/null
    unzip -o -u $lang.zip > /dev/null

    # This is the AWS version to get the language but right now it's slower.
    # aws s3 cp s3://$BUCKET/$lastversion/$lang.zip . > /dev/null

    rm $lang.zip
    popd > /dev/null
}

# Entry function to get all language files.
function get_languages {
    get_last_version

    if [ -d $LANGPACKSFOLDER ]; then
        lastupdate=`date -r $LANGPACKSFOLDER +%s`
        currenttime=`date +%s`
        ellapsedtime=$((currenttime - lastupdate))
        if [ $ellapsedtime -lt 3600 ]; then
            echo 'Recently updated, skip update languages'
            return
        fi
    else
        create_langfolder
    fi


    if [ $AWS_SERVICE -eq 1 ]; then
        get_all_languages_aws
    else
        echo "Fallback language list will only get current installation languages"
        get_installed_languages
    fi

    for lang in $langs; do
        get_language "$lang"
    done
}
