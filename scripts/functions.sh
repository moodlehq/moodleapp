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
    [[ -t 1 ]] && tput setaf 1
    echo "  ERROR:  $1"
    [[ -t 1 ]] && tput sgr0
}

function print_ok {
    [[ -t 1 ]] && tput setaf 2
    echo "     OK:  $1"
    [[ -t 1 ]] && tput sgr0
    echo
}

function print_message {
    [[ -t 1 ]] && tput setaf 3
    echo "--------  $1"
    [[ -t 1 ]] && tput sgr0
    echo
}

function print_title {
    stepnumber=$(($stepnumber + 1))
    echo
    [[ -t 1 ]] && tput setaf 5
    echo "$stepnumber $1"
    [[ -t 1 ]] && tput sgr0
    [[ -t 1 ]] && tput setaf 5
    echo '=================='
    [[ -t 1 ]] && tput sgr0
}

function telegram_notify {
    if [ ! -z "$TELEGRAM_APIKEY" ] && [ ! -z "$TELEGRAM_CHATID" ] ; then
        set_branch_and_repo

        MESSAGE="$1%0ABranch: *$REFNAME* on $REPO%0ACommit: $COMMIT%0AJob: $JOB ($RUN_NUMBER) [Complete log here]($JOB_URL)"
        URL="https://api.telegram.org/bot$TELEGRAM_APIKEY/sendMessage"

        curl -s -X POST "$URL" -d chat_id="$TELEGRAM_CHATID" -d text="$MESSAGE"
    fi
}

function notify_on_error_exit {
    if [ $? -ne 0 ]; then
        print_error "$1"
        telegram_notify "$1"
        exit 1
    fi
}


function set_branch_and_repo {
    if [ ! -z "$REPO" ]; then
        # Already filled.
        return;
    fi

    if [ -z "$TRAVIS_OS_NAME" ]; then
        #Run on github
        if [ "$RUNNER_OS" == 'macOS' ]; then
            export OS_NAME='osx'
        elif [ "$RUNNER_OS" == 'Linux' ]; then
            export OS_NAME='linux'
        elif [ "$RUNNER_OS" == 'Windows' ]; then
            export OS_NAME='windows'
        fi
        export REFNAME=$GITHUB_REF_NAME
        export REFTYPE=$GITHUB_REF_TYPE
        export REPO=$GITHUB_REPOSITORY
        export COMMIT=$GITHUB_SHA
        export JOB=$GITHUB_JOB
        export JOB_URL=$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID
        export RUN_NUMBER=$GITHUB_RUN_NUMBER
        export CI_TYPE='github'
    else
        # Run on Travis
        export OS_NAME=$TRAVIS_OS_NAME
        if [ -z "$TRAVIS_TAG" ]; then
            export REFTYPE='branch'
            export REFNAME=$TRAVIS_BRANCH
        else
            export REFTYPE='tag'
            export REFNAME=$TRAVIS_TAG
        fi
        export REPO=$TRAVIS_REPO_SLUG
        export COMMIT=$TRAVIS_COMMIT
        export JOB=$TRAVIS_JOB_NAME
        export JOB_URL=$TRAVIS_JOB_WEB_URL
        export RUN_NUMBER=$TRAVIS_BUILD_NUMBER
        export CI_TYPE='travis'
    fi

    if [ -z "$REFNAME" ]; then
        print_error "Empty branch/tag, cancelling..."
        exit 0
    fi

    if [ -z "$REPO" ]; then
        print_error "Empty repo, cancelling..."
        exit 0
    fi

    print_title "Build info:"
    echo "OS_NAME: $OS_NAME"
    echo "REFNAME: $REFNAME"
    echo "REFTYPE: $REFTYPE"
    echo "REPO: $REPO"
    echo "COMMIT: $COMMIT"
    echo "JOB: $JOB"
    echo "JOB_URL: $JOB_URL"
    echo "RUN_NUMBER: $RUN_NUMBER"
    echo "CI_TYPE: $CI_TYPE"
}
