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
const BuildBehatPluginTask = require('./gulp/task-build-behat-plugin');
const BuildEnvTask = require('./gulp/task-build-env');
const BuildIconsJsonTask = require('./gulp/task-build-icons-json');
const OverrideLangTask = require('./gulp/task-override-lang');
const FreezeDependenciesTask = require('./gulp/task-freeze-dependencies');
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

// Build the language files into a single file per language.
gulp.task('lang', (done) => {
    new BuildLangTask().run(paths.lang, done);
});

// Use the English generated lang file (src/assets/lang/en.json) to override strings in features lang.json files.
gulp.task('lang-override', (done) => {
    new OverrideLangTask().run(done);
});

// Build an env file depending on the current environment.
gulp.task('env', (done) => {
    new BuildEnvTask().run(done);
});

gulp.task('icons', (done) => {
    new BuildIconsJsonTask().run(done);
});

gulp.task('freeze-dependencies', (done) => {
    new FreezeDependenciesTask().run(done);
});

// Build a Moodle plugin to run Behat tests.
if (BuildBehatPluginTask.isBehatConfigured()) {
    gulp.task('behat', (done) => {
        new BuildBehatPluginTask().run(done);
    });
}

gulp.task(
    'default',
    gulp.parallel([
        'lang',
        'env',
        'icons',
        ...(BuildBehatPluginTask.isBehatConfigured() ? ['behat'] : [])
    ]),
);

gulp.task('watch', () => {
    gulp.watch(paths.lang, { interval: 500 }, gulp.parallel('lang'));
    gulp.watch(['./moodle.config.json', './moodle.config.*.json'], { interval: 500 }, gulp.parallel('env'));

    if (BuildBehatPluginTask.isBehatConfigured()) {
        gulp.watch(['./tests/behat'], { interval: 500 }, gulp.parallel('behat'));
    }
});

gulp.task('watch-behat', () => {
    gulp.watch(
        [
            './src/**/*.feature',
            './src/**/tests/behat/fixtures/**',
            './src/**/tests/behat/snapshots/**',
            './local_moodleappbehat',
        ],
        { interval: 500 },
        gulp.parallel('behat')
    );
});
