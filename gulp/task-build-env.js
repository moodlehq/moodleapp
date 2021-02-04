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

const { getConfig, getBuild } = require('../scripts/env-utils');
const { resolve } = require('path');
const { writeFile } = require('fs');

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
            CONFIG: getConfig(process.env.NODE_ENV || 'development'),
            BUILD: getBuild(process.env.NODE_ENV || 'development'),
        };

        writeFile(envFile, JSON.stringify(env), done);
    }

}

module.exports = BuildEnvTask;
