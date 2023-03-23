#!/bin/bash
source "./.github/scripts/functions.sh"

if [ -z $GIT_TOKEN ] || [ -z $BEHAT_PLUGIN_GITHUB_REPOSITORY ] || [ -z $BEHAT_PLUGIN_BRANCH ]; then
    print_error "Env vars not correctly defined"
    exit 1
fi

if [[ $BEHAT_PLUGIN_BRANCH != $GITHUB_REF_NAME ]]; then
    echo "Script disabled for this branch"
    exit 0
fi

# Clone plugin repository.
print_title "Cloning Behat plugin repository..."

git clone https://$GIT_TOKEN@github.com/$BEHAT_PLUGIN_GITHUB_REPOSITORY.git tmp/local_moodleappbehat -b $GITHUB_REF_NAME
pluginversion=$(cat tmp/local_moodleappbehat/version.php | grep "\$plugin->version" | grep -o -E "[0-9]+")

# Auto-generate plugin.
print_title "Building Behat plugin..."

if [ -z $BEHAT_PLUGIN_EXCLUDE_FEATURES ]; then
    scripts/build-behat-plugin.js tmp/local_moodleappbehat
else
    scripts/build-behat-plugin.js tmp/local_moodleappbehat --exclude-features
fi
notify_on_error_exit "Unsuccessful build, stopping..."

# Check if there are any changes (ignoring plugin version).
print_title "Checking changes..."

newpluginversion=$(cat tmp/local_moodleappbehat/version.php | grep "\$plugin->version" | grep -o -E "[0-9]+")
sed -i s/\$plugin-\>version\ =\ [0-9]\\+\;/\$plugin-\>version\ =\ $pluginversion\;/ tmp/local_moodleappbehat/version.php

if [[ -z `git -C tmp/local_moodleappbehat/ status --short` ]]; then
    echo "There weren't any changes to apply!"
    exit
fi

if [[ $pluginversion -eq $newpluginversion ]]; then
    ((newpluginversion++))
fi

sed -i s/\$plugin-\>version\ =\ [0-9]\\+\;/\$plugin-\>version\ =\ $newpluginversion\;/ tmp/local_moodleappbehat/version.php

# Apply new changes
print_title "Applying changes to repository..."

diff=`get_behat_plugin_changes_diff`

cd tmp/local_moodleappbehat

# Set up Github Actions bot user
# See https://github.community/t/github-actions-bot-email-address/17204/6
git config --local user.email "41898282+github-actions[bot]@users.noreply.github.com"
git config --local user.name "github-actions[bot]"
git add .
git commit -m "[auto-generated] Update plugin files
Check out the commits that caused these changes: https://github.com/$GITHUB_REPOSITORY/compare/$diff
"
notify_on_error_exit "Unsuccessful commit, stopping..."

echo "Pushing changes..."
git push
notify_on_error_exit "Unsuccessful push, stopping..."

echo "Behat plugin updated!"
