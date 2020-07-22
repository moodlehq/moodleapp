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
const gulp = require('gulp');
const flatten = require('gulp-flatten');
const htmlmin = require('gulp-htmlmin');
const pathLib = require('path');

const TEMPLATES_SRC = [
    './src/components/**/*.html',
    './src/core/**/components/**/*.html',
    './src/core/**/component/**/*.html',
    // Copy all addon components because any component can be injected using extraImports.
    './src/addon/**/components/**/*.html',
    './src/addon/**/component/**/*.html'
];
const TEMPLATES_DEST = './www/templates';

/**
 * Task to copy component templates to www to make compile-html work in AOT.
 */
class CopyComponentTemplatesTask {

    /**
     * Delete a folder and all its contents.
     *
     * @param path [description]
     * @return {[type]}      [description]
     */
    deleteFolderRecursive(path) {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach((file) => {
                var curPath = pathLib.join(path, file);

                if (fs.lstatSync(curPath).isDirectory()) {
                    this.deleteFolderRecursive(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });

            fs.rmdirSync(path);
        }
    }

    /**
     * Run the task.
     *
     * @param done Callback to call once done.
     */
    run(done) {
        this.deleteFolderRecursive(TEMPLATES_DEST);

        gulp.src(TEMPLATES_SRC, { allowEmpty: true })
            .pipe(flatten())
            // Check options here: https://github.com/kangax/html-minifier
            .pipe(htmlmin({
                collapseWhitespace: true,
                removeComments: true,
                caseSensitive: true
            }))
            .pipe(gulp.dest(TEMPLATES_DEST))
            .on('end', done);
    }
}

module.exports = CopyComponentTemplatesTask;
