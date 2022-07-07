#!/bin/bash

function check_success_exit {
    if [ $? -ne 0 ]; then
        print_error "$1"
        exit 1
    elif [ "$#" -gt 1 ]; then
        print_ok "$2"
    fi
}

function check_success {
    if [ $? -ne 0 ]; then
        print_error "$1"
    elif [ "$#" -gt 1 ]; then
        print_ok "$2"
    fi
}

function print_success {
    if [ $? -ne 0 ]; then
        print_message "$1"
        $3=0
    else
        print_ok "$2"
    fi
}

function print_error {
    echo "  ERROR:  $1"
}

function print_ok {
    echo "     OK:  $1"
    echo
}

function print_message {
    echo "--------  $1"
    echo
}

function print_title {
    stepnumber=$(($stepnumber + 1))
    echo
    echo "$stepnumber $1"
    echo '=================='
}

function telegram_notify {
    if [ ! -z $TELEGRAM_APIKEY ] && [ ! -z $TELEGRAM_CHATID ] ; then
        MESSAGE="Travis error: $1%0ABranch: $TRAVIS_BRANCH%0ARepo: $TRAVIS_REPO_SLUG"
        URL="https://api.telegram.org/bot$TELEGRAM_APIKEY/sendMessage"

        curl -s -X POST $URL -d chat_id=$TELEGRAM_CHATID -d text="$MESSAGE"
    fi
}

function notify_on_error_exit {
    if [ $? -ne 0 ]; then
        print_error "$1"
        telegram_notify "$1"
        exit 1
    fi
}

function get_behat_plugin_changes_diff {
    # Grab hashes from app repository
    currenthash=`git rev-parse HEAD`
    initialhash=`git rev-list HEAD | tail -n 1`

    # Move into plugin repository to find previous hash
    cd tmp/local_moodleappbehat

    i=0
    previoushash=""
    totalcommits=`git log --oneline | wc -l`
    repositoryname=`echo $GITHUB_REPOSITORY | sed "s/\\//\\\\\\\\\\//"`

    ((totalcommits--))
    while [ $i -lt $totalcommits ] && [[ -z $previoushash ]]; do
        previoushash=`git rev-list --format=%B --max-count=1 HEAD~$i | grep -o "https:\/\/github\.com\/$repositoryname\/compare\/[^.]\+\.\.\.[^.]\+" | sed "s/https:\/\/github\.com\/$repositoryname\/compare\/[^.]\+\.\.\.//"`
        ((i++))
    done

    if [[ -z $previoushash ]]; then
        previoushash=$initialhash
    fi

    echo "$previoushash...$currenthash"
}
