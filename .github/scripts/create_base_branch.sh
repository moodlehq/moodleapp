#!/bin/bash

# Script to be invoked via Github actions to create a base branch for its current version

source "./.github/scripts/functions.sh"

if [ -z "${GIT_TOKEN:-}" ] ; then
    print_error "Env vars not correctly defined"
    exit 1
fi

print_title "Run create Base Branch scripts"
git clone --depth 1 --single-branch --branch ionic5 "https://$GIT_TOKEN@github.com/moodlemobile/apps-scripts.git" ../scripts
cp ../scripts/*.sh scripts/
cp -R ../scripts/patches scripts/

if [ ! -f scripts/create-base-branch.sh ]; then
    print_error "Create Base Branch file not found"
    exit 1
fi

print_title 'Create Base Branch'
./scripts/create-base-branch.sh

if [ $? -ne 0 ]; then
    exit 1
fi
