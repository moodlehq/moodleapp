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
                        let value = config[key];

                        if (typeof value == 'string') {
                            // Wrap the string in ' and escape them.
                            value = "'" + value.replace(/([^\\])'/g, "$1\\'") + "'";
                        } else if (typeof value != 'number' && typeof value != 'boolean') {
                            // Stringify with 4 spaces of indentation, and then add 4 more spaces in each line.
                            value = JSON.stringify(value, null, 4).replace(/^(?:    )/gm, '        ').replace(/^(?:})/gm, '    }');
                            // Replace " by ' in values.
                            value = value.replace(/: "([^"]*)"/g, ": '$1'");

                            // Check if the keys have "-" in it.
                            const matches = value.match(/"([^"]*\-[^"]*)":/g);
                            if (matches) {
                                // Replace " by ' in keys. We cannot remove them because keys have chars like '-'.
                                value = value.replace(/"([^"]*)":/g, "'$1':");
                            } else {
                                // Remove ' in keys.
                                value = value.replace(/"([^"]*)":/g, "$1:");
                            }

                            // Add type any to the key.
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
}

module.exports = BuildConfigTask;
