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

const fs = require('fs');

const DEV_CONFIG_FILE = '.moodleapp-dev-config';

/**
 * Class to read and write dev-config data from a file.
 */
class DevConfig {

    constructor() {
        this.loadFileData();
    }

    /**
     * Get a setting.
     *
     * @param name Name of the setting to get.
     * @param defaultValue Value to use if not found.
     */
    get(name, defaultValue) {
        return typeof this.config[name] != 'undefined' ? this.config[name] : defaultValue;
    }

    /**
     * Load file data to memory.
     */
    loadFileData() {
        if (!fs.existsSync(DEV_CONFIG_FILE)) {
            this.config = {};

            return;
        }

        try {
            this.config = JSON.parse(fs.readFileSync(DEV_CONFIG_FILE));
        } catch (error) {
            console.error('Error reading dev config file.', error);
            this.config = {};
        }
    }

    /**
     * Save some settings.
     *
     * @param settings Object with the settings to save.
     */
    save(settings) {
        this.config = Object.assign(this.config, settings);

        // Save the data in the dev file.
        fs.writeFileSync(DEV_CONFIG_FILE, JSON.stringify(this.config, null, 4));
    }
}

module.exports = new DevConfig();
