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
const concat = require('gulp-concat');
const pathLib = require('path');
const fs = require('fs');

/**
 * Task to combine scss into a single file.
 */
class CombineScssTask {

    /**
     * Finds the file and returns its content.
     *
     * @param capture Import file path.
     * @param baseDir Directory where the file was found.
     * @param paths Alternative paths where to find the imports.
     * @param parsedFiles Already parsed files to reduce size of the result.
     * @return Partially combined scss.
     */
    getReplace(capture, baseDir, paths, parsedFiles) {
        let parse = pathLib.parse(pathLib.resolve(baseDir, capture + '.scss'));
        let file = parse.dir + '/' + parse.name;

        if (file.slice(-3) === '.wp') {
            console.log('Windows Phone not supported "' + capture);
            // File was already parsed, leave the import commented.
            return '// @import "' + capture + '";';
        }

        if (!fs.existsSync(file + '.scss')) {
            // File not found, might be a partial file.
            file = parse.dir + '/_' + parse.name;
        }

        // If file still not found, try to find the file in the alternative paths.
        let x = 0;
        while (!fs.existsSync(file + '.scss') && paths.length > x) {
            parse = pathLib.parse(pathLib.resolve(paths[x], capture + '.scss'));
            file = parse.dir + '/' + parse.name;

            x++;
        }

        file = file + '.scss';

        if (!fs.existsSync(file)) {
            // File not found. Leave the import there.
            console.log('File "' + capture + '" not found');
            return '@import "' + capture + '";';
        }

        if (parsedFiles.indexOf(file) >= 0) {
            console.log('File "' + capture + '" already parsed');
            // File was already parsed, leave the import commented.
            return '// @import "' + capture + '";';
        }

        parsedFiles.push(file);
        const text = fs.readFileSync(file);

        // Recursive call.
        return this.scssCombine(text, parse.dir, paths, parsedFiles);
    }

    /**
     * Run the task.
     *
     * @param done Function to call when done.
     */
    run(done) {
        const paths = [
            'node_modules/ionic-angular/themes/',
            'node_modules/font-awesome/scss/',
            'node_modules/ionicons/dist/scss/'
        ];
        const parsedFiles = [];
        const self = this;

        gulp.src([
                './src/theme/variables.scss',
                './node_modules/ionic-angular/themes/ionic.globals.*.scss',
                './node_modules/ionic-angular/themes/ionic.components.scss',
                './src/**/*.scss',
            ]).pipe(through(function(file) { // Combine them based on @import and save it to stream.
                if (file.isNull()) {
                    return;
                }

                parsedFiles.push(file);
                file.contents = bufferFrom(self.scssCombine(
                        file.contents, pathLib.dirname(file.path), paths, parsedFiles));

                this.emit('data', file);
            })).pipe(concat('combined.scss')) // Concat the stream output in single file.
            .pipe(gulp.dest('.')) // Save file to destination.
            .on('end', done);
    }

    /**
     * Combine scss files with its imports
     *
     * @param content Scss string to treat.
     * @param baseDir Directory where the file was found.
     * @param paths Alternative paths where to find the imports.
     * @param parsedFiles Already parsed files to reduce size of the result.
     * @return Scss string with the replaces done.
     */
    scssCombine(content, baseDir, paths, parsedFiles) {
        // Content is a Buffer, convert to string.
        if (typeof content != "string") {
            content = content.toString();
        }

        // Search of single imports.
        let regex = /@import[ ]*['"](.*)['"][ ]*;/g;

        if (regex.test(content)) {
            return content.replace(regex, (m, capture) => {
                if (capture == "bmma") {
                    return m;
                }

                return this.getReplace(capture, baseDir, paths, parsedFiles);
            });
        }

        // Search of multiple imports.
        regex = /@import(?:[ \n]+['"](.*)['"][,]?[ \n]*)+;/gm;
        if (regex.test(content)) {
            return content.replace(regex, (m, capture) => {
                let text = '';

                // Divide the import into multiple files.
                const captures = m.match(/['"]([^'"]*)['"]/g);

                for (let x in captures) {
                    text += this.getReplace(captures[x].replace(/['"]+/g, ''), baseDir, paths, parsedFiles) + '\n';
                }

                return text;
            });
        }

        return content;
    }
}

module.exports = CombineScssTask;
