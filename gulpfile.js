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

const BuildConfigTask = require('./gulp/task-build-config');
const BuildLangTask = require('./gulp/task-build-lang');
const CombineScssTask = require('./gulp/task-combine-scss');
const CopyComponentTemplatesTask = require('./gulp/task-copy-component-templates');
const PushTask = require('./gulp/task-push');
const Utils = require('./gulp/utils');
const gulp = require('gulp');
const pathLib = require('path');

const paths = {
    lang: [
        './src/lang/',
        './src/core/**/lang/',
        './src/addon/**/lang/',
        './src/assets/countries/',
        './src/assets/mimetypes/'
    ],
    config: './src/config.json',
};

const args = Utils.getCommandLineArguments();

// Build the language files into a single file per language.
gulp.task('lang', (done) => {
    new BuildLangTask().run('en', paths.lang, done);
});

// Convert config.json into a TypeScript class.
gulp.task('config', (done) => {
    new BuildConfigTask().run(paths.config, done);
});

// Copy component templates to www to make compile-html work in AOT.
gulp.task('copy-component-templates', (done) => {
    new CopyComponentTemplatesTask().run(done);
});

// Combine SCSS files.
gulp.task('combine-scss', (done) => {
    new CombineScssTask().run(done);
});

gulp.task('push', (done) => {
    new PushTask().run(args, done);
});

gulp.task('default', gulp.parallel('lang', 'config'));

gulp.task('watch', () => {
    const langsPaths = paths.lang.map(path => path + 'en.json');

    gulp.watch(langsPaths, { interval: 500 }, gulp.parallel('lang'));
    gulp.watch(paths.config, { interval: 500 }, gulp.parallel('config'));
});
