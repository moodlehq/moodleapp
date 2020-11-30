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
const through = require('through');
const bufferFrom = require('buffer-from');
const rename = require('gulp-rename');
const exec = require('child_process').exec;

const LICENSE = '' +
        '// (C) Copyright 2015 Moodle Pty Ltd.\n' +
        '//\n' +
        '// Licensed under the Apache License, Version 2.0 (the "License");\n' +
        '// you may not use this file except in compliance with the License.\n' +
        '// You may obtain a copy of the License at\n' +
        '//\n' +
        '//     http://www.apache.org/licenses/LICENSE-2.0\n' +
        '//\n' +
        '// Unless required by applicable law or agreed to in writing, software\n' +
        '// distributed under the License is distributed on an "AS IS" BASIS,\n' +
        '// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n' +
        '// See the License for the specific language governing permissions and\n' +
        '// limitations under the License.\n\n';

/**
 * Task to convert config.json into a TypeScript class.
 */
class BuildConfigTask {

    /**
     * Run the task.
     *
     * @param path Path to the config file.
     * @param done Function to call when done.
     */
    run(path, done) {
        const self = this;

        // Get the last commit.
        exec('git log -1 --pretty=format:"%H"', (err, commit, stderr) => {
            if (err) {
                console.error('An error occurred while getting the last commit: ' + err);
            } else if (stderr) {
                console.error('An error occurred while getting the last commit: ' + stderr);
            }

            gulp.src(path)
                .pipe(through(function(file) {
                    // Convert the contents of the file into a TypeScript class.
                    // Disable the rule variable-name in the file.
                    const config = JSON.parse(file.contents.toString());
                    let contents = LICENSE + '// tslint:disable: variable-name\n' + 'export class CoreConfigConstants {\n';

                    for (let key in config) {
                        let value = self.transformValue(config[key]);

                        if (typeof config[key] != 'number' && typeof config[key] != 'boolean' && typeof config[key] != 'string') {
                            key = key + ': any';
                        }

                        // If key has quotation marks, remove them.
                        if (key[0] == '"') {
                            key = key.substr(1, key.length - 2);
                        }
                        contents += '    static ' + key + ' = ' + value + ';\n';
                    }

                    // Add compilation info.
                    contents += '    static compilationtime = ' + Date.now() + ';\n';
                    contents += '    static lastcommit = \'' + commit + '\';\n';

                    contents += '}\n';

                    file.contents = bufferFrom(contents);

                    this.emit('data', file);
                }))
                .pipe(rename('configconstants.ts'))
                .pipe(gulp.dest('./src'))
                .on('end', done);
        });
    }


    /**
     * Recursively transform a config value into personalized TS.
     *
     * @param  value Value to convert
     * @return Converted value.
     */
    transformValue(value) {
        if (typeof value == 'string') {
            // Wrap the string in ' and escape them.
            return "'" + value.replace(/([^\\])'/g, "$1\\'") + "'";
        }

        if (typeof value != 'number' && typeof value != 'boolean') {
            const isArray = Array.isArray(value);
            let contents = '';

            let quoteKeys = false;
            if (!isArray) {
                for (let key in value) {
                    if (key.indexOf('-') >= 0) {
                        quoteKeys = true;
                        break;
                    }
                }
            }

            for (let key in value) {
                value[key] = this.transformValue(value[key]);

                const quotedKey = quoteKeys ? "'" + key + "'" : key;
                contents += '    ' + (isArray ? '' : quotedKey + ': ') + value[key] + ",\n";
            }

            contents += (isArray ? ']' : '}');

            return (isArray ? '[' : '{') + "\n" + contents.replace(/^/gm, '    ');
        }

        return value;
    }
}

module.exports = BuildConfigTask;
