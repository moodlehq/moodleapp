var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var insert = require('gulp-insert');
var stripComments = require('gulp-strip-comments');
var removeEmptyLines = require('gulp-remove-empty-lines');
var clipEmptyFiles = require('gulp-clip-empty-files');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var tap = require('gulp-tap');
var sh = require('shelljs');

var license = '' +
  '// (C) Copyright 2015 Martin Dougiamas\n' +
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

var paths = {
  js: [
    './www/app.js',
    './www/core/main.js',
    './www/core/lib/*.js',
    './www/core/components/**/main.js',
    './www/core/components/**/*.js',
    './www/plugins/**/main.js',
    './www/plugins/**/*.js',
    '!./www/**/tests/*.js'
  ],
  sass: ['./scss/**/*.scss']
};

gulp.task('default', ['build', 'sass']);

gulp.task('sass', function(done) {
  gulp.src('./scss/ionic.app.scss')
    .pipe(sass())
    .pipe(gulp.dest('./www/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./www/css/'))
    .on('end', done);
});

gulp.task('watch', function() {
  gulp.watch(paths.sass, ['sass']);
  gulp.watch(paths.js, ['build']);
});

gulp.task('build', function() {
  var dependencies = ["'mm.core'"],
      componentRegex = /core\/components\/([^\/]+)\/main.js/,
      pluginRegex = /plugins\/([^\/]+)\/main.js/;

  gulp.src(paths.js)
    .pipe(clipEmptyFiles())
    .pipe(tap(function(file, t) {
      if (componentRegex.test(file.path)) {
        dependencies.push("'mm.core." + file.path.match(componentRegex)[1] + "'");
      } else if (pluginRegex.test(file.path)) {
        dependencies.push("'mm.plugins." + file.path.match(pluginRegex)[1] + "'");
      }
    }))

    // Remove comments, remove empty lines, concat and add license.
    .pipe(stripComments())
    .pipe(removeEmptyLines())
    .pipe(concat('mm.bundle.js'))
    .pipe(insert.prepend(license))

    // Add dependencies, this assumes that the mm module is declared on one line.
    .pipe(insert.transform(function(contents) {
      return contents.replace(
        "angular.module('mm', ['ionic'",
        "angular.module('mm', ['ionic', " + dependencies.join(', '));
    }))
    .pipe(gulp.dest('./www/build'));
})

gulp.task('install', ['git-check'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('git-check', function(done) {
  if (!sh.which('git')) {
    console.log(
      '  ' + gutil.colors.red('Git is not installed.'),
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
      '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
    );
    process.exit(1);
  }
  done();
});
