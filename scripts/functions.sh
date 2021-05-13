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
    tput setaf 1; echo "  ERROR:  $1"; tput sgr0
}

function print_ok {
    tput setaf 2; echo "     OK:  $1"; tput sgr0
    echo
}

function print_message {
    tput setaf 3; echo "--------  $1"; tput sgr0
    echo
}

function print_title {
    stepnumber=$(($stepnumber + 1))
    echo
    tput setaf 5; echo "$stepnumber $1"; tput sgr0
    tput setaf 5; echo '=================='; tput sgr0
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
