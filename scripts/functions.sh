#!/bin/bash

LANGPACKSFOLDER='../../moodle-langpacks'

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
    tput setaf 1; echo "  ERROR:  $1"
}

function print_ok {
    tput setaf 2; echo "     OK:  $1"
    echo
}

function print_message {
    tput setaf 3; echo "--------  $1"
    echo
}

function print_title {
    stepnumber=$(($stepnumber + 1))
    echo
    tput setaf 5; echo "$stepnumber $1"
    tput setaf 5; echo '=================='
}