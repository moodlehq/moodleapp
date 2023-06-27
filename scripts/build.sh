#!/bin/bash
source "scripts/functions.sh"

if [ -z "$GIT_TOKEN" ]; then
    print_error "Env vars not correctly defined"
    exit 1
fi

print_title "Run scripts"
git clone --depth 1 --single-branch --branch ionic5 https://"$GIT_TOKEN"@github.com/moodlemobile/apps-scripts.git ../scripts
cp ../scripts/*.sh scripts/

if [ ! -f scripts/platform.sh ]; then
    print_error "Platform file not found"
    exit 1
fi

print_title 'Platform Build'
./scripts/platform.sh

if [ $? -ne 0 ]; then
    exit 1
fi
