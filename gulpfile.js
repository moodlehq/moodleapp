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

const BuildLangTask = require('./gulp/task-build-lang');
const PushTask = require('./gulp/task-push');
const Utils = require('./gulp/utils');
const gulp = require('gulp');

const paths = {
    lang: [
        './src/addons/**/',
        './src/assets/countries.json',
        './src/assets/mimetypes.json',
        './src/core/features/**/',
        './src/core/',
    ],
};

const args = Utils.getCommandLineArguments();

// Build the language files into a single file per language.
gulp.task('lang', (done) => {
    new BuildLangTask().run(paths.lang, done);
});

gulp.task('push', (done) => {
    new PushTask().run(args, done);
});

gulp.task('default', gulp.parallel('lang'));

gulp.task('watch', () => {
    gulp.watch(langsPaths, { interval: 500 }, gulp.parallel('lang'));
});
