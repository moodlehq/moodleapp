#!/bin/bash

source "./scripts/functions.sh"

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
