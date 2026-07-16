#!/bin/bash
source "./.github/scripts/functions.sh"

if [ -z $GIT_TOKEN ] || [ -z $BEHAT_PLUGIN_GITHUB_REPOSITORY ]; then
    print_error "Env vars not correctly defined"
    exit 1
fi


BRANCHNAME=${GITHUB_REF_NAME#$BEHAT_PLUGIN_BRANCH_PREFIX}
if [[ $BRANCHNAME != "main" && $BRANCHNAME != "latest" ]]; then
    echo "Script disabled for this branch"
    exit 0
fi

REPO_PATH="/tmp/local_moodleappbehat"

# Clone plugin repository.
print_title "Cloning Behat plugin repository..."

git clone https://$GIT_TOKEN@github.com/$BEHAT_PLUGIN_GITHUB_REPOSITORY.git "${REPO_PATH}" -b $GITHUB_REF_NAME

build_behat_plugin $GITHUB_REF_NAME $BEHAT_PLUGIN_EXCLUDE_FEATURES

# Update the ci branch with the same content as latest but with feature files.
if [[ $GITHUB_REF_NAME == "latest" ]]; then
    pushd "${REPO_PATH}"
    print_title "Checking out ci branch of Behat plugin repository..."
    git checkout ci
    popd

    build_behat_plugin ci
fi


function build_behat_plugin() {
    branchname=$1
    excludefeatures=$2

    pluginversion=$(cat "${REPO_PATH}"/version.php | grep "\$plugin->version" | grep -o -E "[0-9]+")

    # Build Behat plugin for ci branch.
    print_title "Building Behat plugin for branch ${branchname}..."

    if [ -z $excludefeatures ]; then
        scripts/build-behat-plugin.js "${REPO_PATH}"
    else
        scripts/build-behat-plugin.js "${REPO_PATH}" --exclude-features
    fi

    notify_on_error_exit "Unsuccessful build for branch ${branchname}, stopping..."

    # Check if there are any changes (ignoring plugin version).
    print_title "Checking changes for branch ${branchname}..."

    newpluginversion=$(cat "${REPO_PATH}"/version.php | grep "\$plugin->version" | grep -o -E "[0-9]+")
    sed -i s/\$plugin-\>version\ =\ [0-9]\\+\;/\$plugin-\>version\ =\ $pluginversion\;/ "${REPO_PATH}"/version.php

    if [[ -z `git -C "${REPO_PATH}"/ status --short` ]]; then
        echo "There weren't any changes to apply to branch ${branchname}!"
        exit
    fi

    if [[ $pluginversion -eq $newpluginversion ]]; then
        ((newpluginversion++))
    fi

    sed -i s/\$plugin-\>version\ =\ [0-9]\\+\;/\$plugin-\>version\ =\ $newpluginversion\;/ "${REPO_PATH}"/version.php

    # Apply new changes to ci branch.
    print_title "Applying changes to branch ${branchname}..."

    pushd "${REPO_PATH}"

    git config --local user.email "41898282+github-actions[bot]@users.noreply.github.com"
    git config --local user.name "github-actions[bot]"
    git add .
    git commit -m "[auto-generated] Update plugin files
Check out the commits that caused these changes: https://github.com/$GITHUB_REPOSITORY/compare/$diff
"
    notify_on_error_exit "Unsuccessful commit for branch ${branchname}, stopping..."

    echo "Pushing changes to ci branch..."
    git push
    notify_on_error_exit "Unsuccessful push to ci branch, stopping..."

    popd

    echo "Behat plugin branch ${branchname} updated!"
}
