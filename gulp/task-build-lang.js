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
const clipEmptyFiles = require('gulp-clip-empty-files');
const through = require('through');
const bufferFrom = require('buffer-from');
const File = require('vinyl');
const pathLib = require('path');

/**
 * Task to build the language files into a single file per language.
 */
class BuildLangTask {

    /**
     * Copy a property from one object to another, adding a prefix to the key if needed.
     *
     * @param target Object to copy the properties to.
     * @param source Object to copy the properties from.
     * @param prefix Prefix to add to the keys.
     */
    addProperties(target, source, prefix) {
        for (let property in source) {
            target[prefix + property] = source[property];
        }
    }

    /**
     * Run the task.
     *
     * @param langPaths Paths to the possible language files.
     * @param done Function to call when done.
     */
    run(langPaths, done) {
        const data = {};
        let firstFile = null;
        const self = this;

        const paths = langPaths.map((path) => {
            if (path.endsWith('.json')) {
                return path;
            }

            if (!path.endsWith('/')) {
                path = path + '/';
            }

            return path + 'lang.json';
        });

        gulp.src(paths, { allowEmpty: true })
            .pipe(slash())
            .pipe(clipEmptyFiles())
            .pipe(through(function(file) {
                if (!firstFile) {
                    firstFile = file;
                }

                return self.treatFile(file, data);
            }, function() {
                /* This implementation is based on gulp-jsoncombine module.
                 * https://github.com/reflog/gulp-jsoncombine */
                if (firstFile) {
                    const joinedPath = pathLib.join(firstFile.base, 'en.json');

                    const joinedFile = new File({
                        cwd: firstFile.cwd,
                        base: firstFile.base,
                        path: joinedPath,
                        contents: self.treatMergedData(data),
                    });

                    this.emit('data', joinedFile);
                }

                this.emit('end');
            }))
            .pipe(gulp.dest(pathLib.join('./src/assets', 'lang')))
            .on('end', done);
    }

    /**
     * Treats a file to merge JSONs. This function is based on gulp-jsoncombine module.
     * https://github.com/reflog/gulp-jsoncombine
     *
     * @param file File treated.
     * @param data Object where to store the data.
     */
    treatFile(file, data) {
        if (file.isNull() || file.isStream()) {
            return; // ignore
        }

        try {
            let path = file.path;
            let length = 9;

            let srcPos = path.lastIndexOf('/src/app/');
            if (srcPos < 0) {
                // It's probably a Windows environment.
                srcPos = path.lastIndexOf('\\src\\app\\');
            }
            if (srcPos < 0) {
                length = 5;
                srcPos = path.lastIndexOf('/src/');
                if (srcPos < 0) {
                    // It's probably a Windows environment.
                    srcPos = path.lastIndexOf('\\src\\');
                }
            }
            path = path.substr(srcPos + length);

            data[path] = JSON.parse(file.contents.toString());
        } catch (err) {
            console.log('Error parsing JSON: ' + err);
        }
    }

    /**
     * Treats the merged JSON data, adding prefixes depending on the component.
     *
     * @param data Merged data.
     * @return Buffer with the treated data.
     */
    treatMergedData(data) {
        const merged = {};
        const mergedOrdered = {};
        const getPrefix = (path) => {
            const folders = path.split(/[\/\\]/);
            let filename = folders.pop();

            switch (folders[0]) {
                case 'core':
                    if (folders[1] == 'features') {
                        return `core.${folders[2]}.`;
                    } else {
                        return 'core.';
                    }
                case 'addons':
                    return `addon.${folders.slice(1).join('_')}.`;
                case 'assets':
                    filename = filename.split('.').slice(0, -1).join('.');
                    return `assets.${filename}.`;
                default:
                    return `${folders[0]}.${folders[1]}.`;
            }
        }

        for (let filepath in data) {
            const prefix = getPrefix(filepath);
            if (prefix) {
                this.addProperties(merged, data[filepath], prefix);
            }
        }

        // Force ordering by string key.
        Object.keys(merged).sort().forEach((key) => {
            mergedOrdered[key] = merged[key];
        });

        return bufferFrom(JSON.stringify(mergedOrdered, null, 4));
    }
}

module.exports = BuildLangTask;
