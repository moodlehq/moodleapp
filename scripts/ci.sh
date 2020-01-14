#!/bin/bash

if [ $TRAVIS_EVENT_TYPE == 'cron' ]  ; then
    # Tests scripts.
    echo 'CRON NOT IMPLEMENTED YET'
else
    ./scripts/aot.sh
fi
