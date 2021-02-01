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
const { resolve } = require('path');

function getConfig(environment) {
    const { parse: parseJsonc } = require('jsonc-parser');
    const { readFileSync, existsSync } = require('fs');
    const envSuffixesMap = {
        testing: ['test', 'testing'],
        development: ['dev', 'development'],
        production: ['prod', 'production'],
    };
    const config = parseJsonc(readFileSync(resolve(__dirname, '../moodle.config.json')).toString());
    const envSuffixes =  (envSuffixesMap[environment] || []);
    const envConfigPath = envSuffixes.map(suffix => resolve(__dirname, `../moodle.${suffix}.config.json`)).find(existsSync);

    if (envConfigPath) {
        const envConfig = parseJsonc(readFileSync(envConfigPath).toString());

        for (const [key, value] of Object.entries(envConfig)) {
            config[key] = value;
        }
    }

    return config;
}

function getBuild(environment) {
    return {
        isProduction: environment === 'production',
        isTesting: environment === 'testing',
        isDevelopment: environment === 'development',
        lastCommitHash: execSync('git log -1 --pretty=format:"%H"').toString(),
        compilationTime: Date.now(),
    };
}

module.exports = { getConfig, getBuild };
