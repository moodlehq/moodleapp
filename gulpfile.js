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
var fs = require('fs');
var through = require('through');
var path = require('path');
var File = gutil.File;
var gulpSlash = require('gulp-slash');
var ngAnnotate = require('gulp-ng-annotate');

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
  '// limitations under the License.\n\n',
  buildFile = 'mm.bundle.js';

var paths = {
  build: './www/build',
  js: [
    './www/app.js',
    './www/core/main.js',
    './www/core/lib/*.js',
    './www/core/filters/*.js',
    './www/core/directives/*.js',
    './www/core/components/**/main.js',
    './www/core/components/**/*.js',
    './www/addons/**/main.js',
    './www/addons/**/*.js',
    '!./www/**/tests/*.js'
  ],
  sass: {
    core: [
      './www/core/scss/*.scss',
      './www/core/components/**/scss/*.scss',
      './www/addons/**/scss/*.scss',
    ],
    custom: [
      './scss/app.scss',
      './scss/**/*.scss'
    ]
  },
  lang: [
    './www/core/lang/',
    './www/core/components/**/lang/',
    './www/addons/**/lang/',
    './www/core/assets/countries/'
  ],
  config: './www/config.json'
};

gulp.task('default', ['build', 'sass', 'lang', 'config']);

gulp.task('sass-build', function(done) {
  gulp.src(paths.sass.core)
    .pipe(concat('mm.bundle.scss'))
    .pipe(gulp.dest(paths.build))
    .on('end', done);
});

gulp.task('sass', ['sass-build'], function(done) {
  gulp.src(paths.sass.custom)
    .pipe(concat('mm.bundle.css'))
    .pipe(sass())
    .pipe(gulp.dest(paths.build))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest(paths.build))
    .on('end', done);
});

gulp.task('watch', function() {
  gulp.watch(paths.sass.core, ['sass']);
  gulp.watch(paths.sass.custom, ['sass']);
  gulp.watch(paths.js, ['build', 'config']);
  var langsPaths = paths.lang.map(function(path) {
    return path + '*.json';
  });
  gulp.watch(langsPaths, ['lang']);
  gulp.watch(paths.config, ['config']);
});

gulp.task('build', function(done) {
  var dependencies = ["'mm.core'"],
      componentRegex = /core\/components\/([^\/]+)\/main.js/,
      pluginRegex = /addons\/([^\/]+)\/main.js/;

  gulp.src(paths.js)
    .pipe(gulpSlash())
    .pipe(clipEmptyFiles())
    .pipe(tap(function(file, t) {
      if (componentRegex.test(file.path)) {
        dependencies.push("'mm.core." + file.path.match(componentRegex)[1] + "'");
      } else if (pluginRegex.test(file.path)) {
        dependencies.push("'mm.addons." + file.path.match(pluginRegex)[1] + "'");
      }
    }))

    // Remove comments, remove empty lines, concat and add license.
    .pipe(stripComments())
    .pipe(removeEmptyLines())
    .pipe(ngAnnotate()) // This step fixes DI declarations for FirefoxOS.
    .pipe(concat(buildFile))
    .pipe(insert.prepend(license))

    // Add dependencies, this assumes that the mm module is declared on one line.
    .pipe(insert.transform(function(contents) {
      return contents.replace(
        "angular.module('mm', ['ionic'",
        "angular.module('mm', ['ionic', " + dependencies.join(', '));
    }))
    .pipe(gulp.dest(paths.build))
    .on('end', done);
});

gulp.task('lang', function() {

  /**
   * Get the names of the JSON files inside a directory.
   * @param  {String} dir Directory's path.
   * @return {Array}      List of filenames.
   */
  function getFilenames(dir) {
    return fs.readdirSync(dir)
      .filter(function(file) {
        return file.indexOf('.json') > -1;
      })
  }

  /**
   * Copy a property from one object to another, adding a prefix to the key if needed.
   * @param {Object} target Object to copy the properties to.
   * @param {Object} source Object to copy the properties from.
   * @param {String} prefix Prefix to add to the keys.
   */
  function addProperties(target, source, prefix) {
    for (var property in source) {
      target[prefix + property] = source[property];
    }
  }

  /**
   * Treats the merged JSON data, adding prefixes depending on the component.
   * @param  {Object} data Merged data.
   * @return {Buffer}      Buffer with the treated data.
   */
  function treatMergedData(data) {
    var merged = {};

    for (var filepath in data) {

      if (filepath.indexOf('core/lang') == 0) {

        addProperties(merged, data[filepath], 'mm.core.');

      } else if (filepath.indexOf('core/components') == 0) {

        var componentName = filepath.replace('core/components/', '');
        componentName = componentName.substr(0, componentName.indexOf('/'));
        addProperties(merged, data[filepath], 'mm.'+componentName+'.');

      } else if (filepath.indexOf('addons') == 0) {

        var pluginName = filepath.replace('addons/', '');
        pluginName = pluginName.substr(0, pluginName.indexOf('/'));
        addProperties(merged, data[filepath], 'mma.'+pluginName+'.');

      } else if (filepath.indexOf('core/assets/countries') == 0) {

        addProperties(merged, data[filepath], 'mm.core.country-');

      }

    }

    return new Buffer(JSON.stringify(merged, null, 4));
  }

  /**
   * Treats a file to merge JSONs. This function is based on gulp-jsoncombine module.
   * https://github.com/reflog/gulp-jsoncombine
   * @param  {Object} file File treated.
   */
  function treatFile(file, data) {
    if (file.isNull() || file.isStream()) {
      return; // ignore
    }
    try {
      var path = file.path.substr(file.path.indexOf('/www/') + 5, file.path.length-5);
      data[path] = JSON.parse(file.contents.toString());
    } catch (err) {
      console.log('Error parsing JSON: ' + err);
    }
  }

  // Get filenames to know which languages are available.
  var filenames = getFilenames(paths.lang[0]);

  filenames.forEach(function(filename) {

    var language = filename.replace('.json', '');

    var langpaths = paths.lang.map(function(path) {
      if (path.slice(-1) != '/') {
        path = path + '/';
      }
      return path + language + '.json';
    });

    var data = {};
    var firstFile = null;

    gulp.src(langpaths)
      .pipe(gulpSlash())
      .pipe(clipEmptyFiles())
      .pipe(through(function(file) {
        if (!firstFile) {
          firstFile = file;
        }
        return treatFile(file, data);
      }, function() {
        /* This implementation is based on gulp-jsoncombine module.
         * https://github.com/reflog/gulp-jsoncombine */
        if (firstFile) {
          var joinedPath = path.join(firstFile.base, language+'.json');

          var joinedFile = new File({
            cwd: firstFile.cwd,
            base: firstFile.base,
            path: joinedPath,
            contents: treatMergedData(data)
          });

          this.emit('data', joinedFile);
        }
        this.emit('end');
      }))
      .pipe(gulp.dest(paths.build + '/lang'));

  });
});

// Convert config.json into an AngularJS constant and append it to build file.
gulp.task('config', ['build'], function(done) {
  var source = [paths.build + '/' + buildFile, paths.config],
    configName = paths.config.substr(paths.config.lastIndexOf('/') + 1);

  gulp.src(source)
    .pipe(through(function(file) {
      if (file.path.indexOf(configName) > -1) {
        // It's config.json, let's convert it to an AngularJS constant.
        var contents = "angular.module('mm.core')\n\n" +
                       ".constant('mmCoreConfigConstants', " + file.contents.toString() + ");";
        file.contents = new Buffer(contents);
      }
      this.emit('data', file);
    }))
    .pipe(concat(buildFile))
    .pipe(gulp.dest(paths.build))
    .on('end', done);
});
