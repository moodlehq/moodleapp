#!/bin/bash

# This script is necessary because @ionic/cli is passing one argument to the ionic:serve hook
# that is unsupported by angular cli: https://github.com/ionic-team/ionic-cli/issues/4743
#
# Once the issue is fixed, this script can be replaced adding the following npm script:
#
#     "ionic:serve": "gulp watch & NODE_OPTIONS=--max-old-space-size=4096 ng serve"
#

# Run gulp watch.
echo "> gulp watch &"
gulp watch &

# Remove unknown arguments and prepare angular target.
args=("$@")
angulartarget="serve"
total=${#args[@]}
for ((i=0; i<total; ++i)); do
    case ${args[i]} in
        --project=*)
            unset args[i];
            ;;
        --platform=*)
            angulartarget="ionic-cordova-serve";
            ;;
    esac
done

# Serve app.
echo "> NODE_OPTIONS=--max-old-space-size=4096 ng run app:$angulartarget ${args[@]}"
NODE_OPTIONS=--max-old-space-size=4096 ng run "app:$angulartarget" ${args[@]}
