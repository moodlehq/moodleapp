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

const gulp = require('gulp');
const slash = require('gulp-slash');
const through = require('through');
const bufferFrom = require('buffer-from');
const pathLib = require('path');
const { readFileSync } = require('fs');

/**
 * Use the English generated lang file (src/assets/lang/en.json) to override strings in features lang.json files.
 */
class OverrideLangTask {

    /**
     * Run the task.
     *
     * @param done Function to call when done.
     */
    run(done) {
        const self = this;

        const path = pathLib.join('./src/assets/lang', 'en.json');
        const data = JSON.parse(readFileSync(path));

        const files = {};

        for (const key in data) {
            let filePath = './src';

            const exp = key.split('.');


            const type = exp.shift();
            let component = 'moodle';
            let plainid = exp.shift();

            if (exp.length > 0) {
                component = plainid;
                plainid = exp.join('.');
            }

            const component_slashes = component.replace(/_/g, '/');

            switch (type) {
                case 'core':
                    if (component == 'moodle') {
                        filePath = pathLib.join(filePath, 'core/lang.json');
                    } else {
                        filePath = pathLib.join(filePath, `/core/features/${component_slashes}/lang.json`);
                    }
                    break;
                case 'addon':
                    filePath = pathLib.join(filePath, `/addons/${component_slashes}/lang.json`);
                    break;
                case 'assets':
                    filePath = pathLib.join(filePath, `/${type}/${component}.json`);
                    break;
                default:
                    filePath = pathLib.join(filePath, `/${type}/lang.json`);
                    break;
            }
            filePath = pathLib.resolve(filePath);

            if (files[filePath] === undefined) {
                files[filePath] = {};
            }

            files[filePath][plainid] = data[key];
        }

        const paths = Object.keys(files);
        gulp.src(paths)
            .pipe(slash())
            .pipe(through(function (destFile) {
                const oldContents = self.readFile(destFile);
                destFile.contents = self.jsonFile(oldContents, files[destFile.path]);

                this.emit('data', destFile);
            }))
            .pipe(gulp.dest((data) => data.base, { overwrite: true }))
            .on('end', done);
    }

    /**
     * Reads file.
     *
     * @param file File treated.
     */
    readFile(file) {
        if (file.isNull() || file.isStream()) {
            return; // ignore
        }

        try {
            return JSON.parse(file.contents.toString());
        } catch (err) {
            console.log('Error parsing JSON: ' + err);
        }
    }

    /**
     * Creates the stringified json.
     *
     * @param oldContents File old data.
     * @param data File data.
     * @return Buffer with the treated data.
     */
    jsonFile(oldContents, data) {
        data = Object.assign(oldContents, data);

        const fileContents = {};
        // Force ordering by string key.
        Object.keys(data).sort().forEach((key) => {
            fileContents[key] = data[key];
        });

        return bufferFrom(JSON.stringify(fileContents, null, 4) + "\n");
    }
}

module.exports = OverrideLangTask;
