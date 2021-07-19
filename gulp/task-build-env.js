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

const { execSync } = require('child_process');
const { existsSync, readFileSync, writeFile } = require('fs');
const { parse: parseJsonc } = require('jsonc-parser');
const { resolve } = require('path');

function getConfig(environment) {
    const envSuffixesMap = {
        testing: ['test', 'testing'],
        development: ['dev', 'development'],
        production: ['prod', 'production'],
    };
    const config = parseJsonc(readFileSync(resolve(__dirname, '../moodle.config.json')).toString());
    const envSuffixes =  (envSuffixesMap[environment] || []);
    const envConfigPath = envSuffixes.map(suffix => resolve(__dirname, `../moodle.config.${suffix}.json`)).find(existsSync);

    if (envConfigPath) {
        const envConfig = parseJsonc(readFileSync(envConfigPath).toString());

        for (const [key, value] of Object.entries(envConfig)) {
            config[key] = value;
        }
    }

    return config;
}

function getBuild(environment) {
    const { version } = JSON.parse(readFileSync(resolve(__dirname, '../package.json')));

    return {
        version,
        isProduction: environment === 'production',
        isTesting: environment === 'testing',
        isDevelopment: environment === 'development',
        lastCommitHash: execSync('git log -1 --pretty=format:"%H"').toString(),
        compilationTime: Date.now(),
    };
}

/**
 * Task to build an env file depending on the current environment.
 */
class BuildEnvTask {

    /**
     * Run the task.
     *
     * @param done Function to call when done.
     */
    run(done) {
        const envFile = resolve(__dirname, '../src/assets/env.json');
        const env = {
            config: getConfig(process.env.NODE_ENV || 'development'),
            build: getBuild(process.env.NODE_ENV || 'development'),
        };

        writeFile(envFile, JSON.stringify(env), done);
    }

}

module.exports = BuildEnvTask;
