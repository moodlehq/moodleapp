#!/bin/bash
#
# Functions to fetch languages.
#

LANGPACKSFOLDER='../../moodle-langpacks' # Langpacks will be downloaded here.
BUCKET='moodle-lang-prod'
MOODLEORG_URL='https://download.moodle.org/download.php/direct/langpack'
DEFAULT_LASTVERSION='4.1' # Update it every version.

# Checks if AWS is available and configured.
function check_aws {
    if [ ! -z $AWS_SERVICE ]; then
        return
    fi

    export AWS_SERVICE=1

    aws --version &> /dev/null
    if [ $? -ne 0 ]; then
        export AWS_SERVICE=0
        echo 'AWS not installed. Check https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html for more info.'
        return
    fi

    # In order to login to AWS, use credentials file or AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY vars.
    if [ ! -f ~/.aws/credentials ] && ([ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]); then
        export AWS_SERVICE=0
        echo 'AWS Cannot authenticate. Use aws configure or set the proper env vars.'
        return
    fi
}

function list_aws_files {
    local folder="$1"
    check_aws

    if [ $AWS_SERVICE -eq 1 ]; then
        export AWS_FOLDERS=`aws s3 ls s3://$BUCKET/$1`
    else
        export AWS_FOLDERS=[]
    fi
}

# Get last version of Moodle to fetch latest languages.
function get_lang_version {
    if [ ! -z "${LANGVERSION}" ]; then
        return
    fi

    APP_VERSION=`jq -r '.versionname' ../moodle.config.json| cut -d. -f1-2`
    if [ ! -z $APP_VERSION ]; then
        export LANGVERSION=$APP_VERSION
        echo "Using app version $LANGVERSION"
        return
    fi

    list_aws_files ''
    LANGVERSION=''
    for folder in $AWS_FOLDERS; do
        if [ $folder != 'PRE' ]; then
            LANGVERSION=${folder/\//}
        fi
    done

    if [ ! -z "${LANGVERSION}" ]; then
        echo "Using last version $LANGVERSION detected"
        return
    fi

    LANGVERSION=$DEFAULT_LASTVERSION
    echo "Using default version $LANGVERSION"
}

# Create langfolder
function create_langfolder {
    if [ ! -d $LANGPACKSFOLDER ]; then
        mkdir $LANGPACKSFOLDER
    fi
}

# Get language list from the installed ones (will not discover new translations).
function get_language_folders {
    list_aws_files "$LANGVERSION/"

    langs=""
    for file in $AWS_FOLDERS; do
        if [[ "$file" == *.zip ]]; then
            file=${file/\.zip/}
            langs+="$file "
        fi
    done

    if [ -z "${langs}" ]; then
        # Get language list from the installed ones (will not discover new translations).
        echo "Fallback language list will only get current installation languages"
        langs=`jq -r '.languages | keys[]' ../moodle.config.json`
    fi
}

# Entry function to get a language file.
function get_language {
    lang=$1
    lang=${lang/-/_}

    get_lang_version

    create_langfolder

    echo "Getting $lang language"

    pushd $LANGPACKSFOLDER > /dev/null

    curl -s $MOODLEORG_URL/$LANGVERSION/$lang.zip --output $lang.zip > /dev/null
    size=$(du -k "$lang.zip" | cut -f 1)
    if [ ! -n $lang.zip ] || [ $size -le 1 ]; then
        echo "Wrong language name or corrupt file for $lang"
        rm $lang.zip

        popd > /dev/null
        return
    fi

    rm -R $lang > /dev/null 2>&1> /dev/null
    unzip -o -u $lang.zip > /dev/null

    # This is the AWS version to get the language but right now it's slower.
    # aws s3 cp s3://$BUCKET/$LANGVERSION/$lang.zip . > /dev/null

    rm $lang.zip
    popd > /dev/null
}

# Entry function to get all language files.
function get_languages {
    suffix=$1
    if [ -z $suffix ]; then
        suffix=''
    fi

    get_lang_version

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

    get_language_folders

    for lang in $langs; do
        get_language "$lang"

        if [ ! -z $suffix ]; then
            get_language "$lang$suffix"
        fi
    done
}
