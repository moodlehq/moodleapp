#!/usr/bin/env node

// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// This script makes sure that javascript assets are kept up to date during development,
// otherwise it would be necessary to reinstall the plugin every time anything changes.

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { resolve } = require('path');

const bundle = readFileSync(resolve(__dirname, '../www/index.js')).toString();
const template = readFileSync(resolve(__dirname, './templates/cordova-plugin.js')).toString();
const pluginsPath = resolve(__dirname, '../../plugins/');
const platformsPath = resolve(__dirname, '../../platforms/');
const filePaths = [
    resolve(pluginsPath, 'cordova-plugin-moodleapp/www/index.js'),
    resolve(platformsPath, 'android/app/src/main/assets/www/plugins/cordova-plugin-moodleapp/www/index.js'),
    resolve(platformsPath, 'android/platform_www/plugins/cordova-plugin-moodleapp/www/index.js'),
    resolve(platformsPath, 'ios/platform_www/plugins/cordova-plugin-moodleapp/www/index.js'),
    resolve(platformsPath, 'ios/www/plugins/cordova-plugin-moodleapp/www/index.js'),
];
const pluginIndex = template
    .replace('[[PLUGIN_NAME]]', 'cordova-plugin-moodleapp.moodleapp')
    .replace('[[PLUGIN_CONTENTS]]', bundle);

for (const filePath of filePaths) {
    if (!existsSync(filePath)) {
        continue;
    }

    writeFileSync(filePath, pluginIndex);
}
