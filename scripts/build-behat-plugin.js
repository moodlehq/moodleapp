#!/usr/bin/env node

// (C) Copyright 2021 Moodle Pty Ltd.
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

const { existsSync, readFileSync, writeFileSync, statSync, renameSync, rmSync } = require('fs');
const { readdir } = require('fs').promises;
const { mkdirSync, copySync } = require('fs-extra');
const { resolve, extname, dirname, basename, relative } = require('path');

async function main() {
    const pluginPath = process.argv[2] || guessPluginPath() || fail('Folder argument missing!');

    if (!existsSync(pluginPath)) {
        mkdirSync(pluginPath);
    } else {
        // Empty directory, except the excluding list.
        const excludeFromErase = [
            '.git',
            '.gitignore',
            'README.md',
        ];

        const files = await readdir(pluginPath, { withFileTypes: true });
        for (const file of files) {
            if (excludeFromErase.indexOf(file.name) >= 0) {
                continue;
            }

            const path = resolve(pluginPath, file.name);
            rmSync(`${path}`, {recursive: true});
        }
    }


    // Copy plugin template.
    const { version: appVersion } = require(projectPath('package.json'));
    const templatePath = projectPath('scripts/templates/behat-plugin');
    const replacements = {
        appVersion,
        pluginVersion: getMoodlePluginVersion(),
    };

    copySync(templatePath, pluginPath);

    for await (const templateFilePath of getDirectoryFiles(templatePath)) {
        const pluginFilePath = pluginPath + templateFilePath.substr(templatePath.length);
        const fileContents = readFileSync(pluginFilePath).toString();

        writeFileSync(pluginFilePath, replaceArguments(fileContents, replacements));
    }

    // Copy plugin files.
    copySync(projectPath('tests/behat'), `${pluginPath}/tests/behat`);

    // Copy feature files.
    const behatTempFeaturesPath = `${pluginPath}/behat-tmp`;
    copySync(projectPath('src'), behatTempFeaturesPath, { filter: isFeatureFileOrDirectory });

    const behatFeaturesPath = `${pluginPath}/tests/behat`;
    if (!existsSync(behatFeaturesPath)) {
        mkdirSync(behatFeaturesPath, {recursive: true});
    }

    for await (const featureFile of getDirectoryFiles(behatTempFeaturesPath)) {
        const featurePath = dirname(featureFile);
        if (!featurePath.endsWith('/tests/behat')) {
            continue;
        }

        const newPath = featurePath.substring(0, featurePath.length - ('/tests/behat'.length));
        const prefix = relative(behatTempFeaturesPath, newPath).replace('/','-') || 'core';
        const featureFilename = prefix + '-' + basename(featureFile);
        renameSync(featureFile, behatFeaturesPath + '/' + featureFilename);
    }

    rmSync(behatTempFeaturesPath, {recursive: true});
}

function isFeatureFileOrDirectory(src) {
    const stats = statSync(src);

    return stats.isDirectory() || extname(src) === '.feature';
}

function fail(message) {
    console.error(message);
    process.exit(1);
}

function guessPluginPath() {
    if (process.env.MOODLE_APP_BEHAT_PLUGIN_PATH) {
        return process.env.MOODLE_APP_BEHAT_PLUGIN_PATH;
    }

    if (process.env.MOODLE_DOCKER_WWWROOT) {
        return `${process.env.MOODLE_DOCKER_WWWROOT}/local/moodleappbehat`;
    }

    return null;
}

function projectPath(path) {
    return resolve(__dirname, '../', path);
}

async function* getDirectoryFiles(dir) {
    const files = await readdir(dir, { withFileTypes: true });

    for (const file of files) {
        const path = resolve(dir, file.name);
        if (file.isDirectory()) {
            yield* getDirectoryFiles(path);
        } else {
            yield path;
        }
    }
}

function replaceArguments(text, args) {
    for (const [arg, value] of Object.entries(args)) {
        const regexp = new RegExp(`\\{\\{\\s+${arg}\\s+\\}\\}`, 'gm');

        text = text.replace(regexp, value);
    }

    return text;
}

function getMoodlePluginVersion() {
    const now = new Date();
    const padded = (number, length = 2) => number.toString().padStart(length, '0');
    const year = padded(now.getFullYear(), 4);
    const month = padded(now.getMonth() + 1);
    const day = padded(now.getDate());

    return `${year}${month}${day}00`;
}

main();
