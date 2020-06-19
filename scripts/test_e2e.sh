#!/bin/bash

source "scripts/functions.sh"

# Prepare variables
basedir="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../" && pwd )"
dockerscripts="$HOME/moodle-docker/bin/"
dockercompose="$dockerscripts/moodle-docker-compose"

export MOODLE_DOCKER_DB=pgsql
export MOODLE_DOCKER_BROWSER=chrome
export MOODLE_DOCKER_WWWROOT="$HOME/moodle"
export MOODLE_DOCKER_PHP_VERSION=7.3
export MOODLE_DOCKER_APP_PATH=$basedir

# Prepare dependencies
print_title "Preparing dependencies"
git clone --branch master --depth 1 git://github.com/moodle/moodle $HOME/moodle
git clone --branch master --depth 1 git://github.com/moodlehq/moodle-local_moodlemobileapp $HOME/moodle/local/moodlemobileapp
# git clone --branch master --depth 1 git://github.com/moodlehq/moodle-docker $HOME/moodle-docker

# TODO replace with commented line above once https://github.com/moodlehq/moodle-docker/pull/126 is merged
mkdir $HOME/moodle-docker
cd $HOME/moodle-docker
git init
git remote add origin git://github.com/moodlehq/moodle-docker
git fetch --depth 1 origin c604d5f9792c72fb9d83f6fec1f4b1defd778e9a
git checkout FETCH_HEAD
cd -

cp $HOME/moodle-docker/config.docker-template.php $HOME/moodle/config.php

# Build app
print_title "Building app"
npm install
npm run setup

# Start containers
print_title "Starting containers"
$dockercompose pull
$dockercompose up -d
$dockerscripts/moodle-docker-wait-for-db
$dockerscripts/moodle-docker-wait-for-app

$dockercompose exec -T webserver sh -c "php admin/tool/behat/cli/init.php"
notify_on_error_exit "e2e failed initializing behat"

print_title "Running e2e tests"

# Run tests
for tags in "$@"
do
    $dockercompose exec -T webserver sh -c "php admin/tool/behat/cli/run.php --tags=\"$tags\""
    notify_on_error_exit "Some e2e tests are failing, please review"
done

# Clean up
$dockercompose down
