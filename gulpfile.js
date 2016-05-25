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
var gfile = require('gulp-file');
var File = gutil.File;
var gulpSlash = require('gulp-slash');
var ngAnnotate = require('gulp-ng-annotate');
var yargs = require('yargs');

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
    '!./www/**/tests/*.js',
    '!./www/**/e2e/*.js'
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
  config: './www/config.json',
  e2e: {
    build: './e2e/build',
    buildToRoot: '../../',
    libs: [
      './e2e/*.js'
    ],
    plugins: './e2e/plugins',
    pluginsToRoot: '../../',
    specs: [
      './www/**/e2e/*.spec.js'
    ]
  }
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
  gulp.watch(paths.sass.core, { interval: 500 }, ['sass']);
  gulp.watch(paths.sass.custom, { interval: 500 }, ['sass']);
  gulp.watch(paths.js, { interval: 500 }, ['build', 'config']);
  var langsPaths = paths.lang.map(function(path) {
    return path + '*.json';
  });
  gulp.watch(langsPaths, { interval: 500 }, ['lang']);
  gulp.watch(paths.config, { interval: 500 }, ['config']);
});

gulp.task('build', function(done) {
  var dependencies = ["'mm.core'"],
      componentRegex = /core\/components\/([^\/]+)\/main.js/,
      pluginRegex = /addons\/([^\/]+)\/main.js/,
      subpluginRegex = /addons\/([^\/]+)\/([^\/]+)\/main.js/;

  gulp.src(paths.js)
    .pipe(gulpSlash())
    .pipe(clipEmptyFiles())
    .pipe(tap(function(file, t) {
      if (componentRegex.test(file.path)) {
        dependencies.push("'mm.core." + file.path.match(componentRegex)[1] + "'");
      } else if (pluginRegex.test(file.path)) {
        dependencies.push("'mm.addons." + file.path.match(pluginRegex)[1] + "'");
      } else if (subpluginRegex.test(file.path)) {
        // It's a subplugin, use plugin_subplugin to identify it.
        var matches = file.path.match(subpluginRegex);
        dependencies.push("'mm.addons." + matches[1] + '_' + matches[2] + "'");
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
      });
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

        var split = filepath.split('/'),
            pluginName = split[1];

        // Check if it's a subplugin. If so, we'll use plugin_subplugin.
        if (split[2] != 'lang') {
          pluginName = pluginName + '_' + split[2];
        }
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

// Build config file for e2e testing.
gulp.task('e2e-build', function() {
  var argv;

  yargs = yargs
    .usage('gulp e2e-build --target <target> <options>')
    .option('target', {
      alias: 't',
      choices: ['browser', 'android', 'ios'],
      describe: 'The target for the test suite'
    })
    .option('output', {
      alias: 'o',
      default: 'protractor.conf.js',
      describe: 'The output file'
    })
    .option('site-url', {
      alias: 'U',
      default: 'http://school.demo.moodle.net',
      describe: 'The URL of the site targetted by the tests'
    })
    .option('site-version', {
      alias: 'V',
      default: 2.9,
      describe: 'The version of the site targetted by the tests (2.8, 2.9, ...)'
    })
    .option('site-uses-local-mobile', {
      alias: 'L',
      describe: 'When set the site is using local_mobile',
      type: 'boolean'
    })
    .option('tablet', {
      describe: 'Indicate that the tests are run on a tablet',
      type: 'boolean'
    })
    .option('help', {   // Fake the help option.
      alias: 'h',
      describe: 'Show help',
      type: 'boolean'
    });

  // Show help when the target was not set.
  argv = yargs.argv;
  if (!argv.target) {
    yargs.showHelp();
    return;
  }

  // Restore the normal use of the help.
  yargs = yargs.help('help');

  // Define the arguments for the browser target.
  if (argv.target == 'browser') {
    yargs = yargs
      .option('webdriver', {
        alias: 'w',
        default: 'http://127.0.0.1:4444/wd/hub',
        describe: 'The URL to the Web Driver'
      })
      .option('browser', {
        alias: 'b',
        default: 'chrome',
        describe: 'The browse to run the test on'
      })
      .option('url', {
        alias: 'u',
        default: 'http://localhost:8100/',
        describe: 'The URL to open the browser at'
      });

  // Arguments for Android.
  } else if (argv.target == 'android') {
    yargs = yargs
      .option('apk', {
        alias: 'a',
        default: 'platforms/android/ant-build/MainActivity-debug.apk',
        describe: 'The relative path to the APK'
      })
      .option('device', {
        alias: 'd',
        demand: true,
        describe: 'The device ID of the targetted device',
      })
      .option('version', {
        alias: 'v',
        demand: true,
        describe: 'The Android version of the targetted device (4.4, 5.0, ...)'
      })
      .option('webdriver', {
        alias: 'w',
        default: 'http://127.0.0.1:4723/wd/hub',
        describe: 'The URL to the Web Driver'
      });

  // Arguments for iOS.
  } else if (argv.target == 'ios') {
    yargs = yargs
      .option('ipa', {
        alias: 'i',
        describe: 'The path to the .ipa'
      })
      .option('device', {
        alias: 'd',
        demand: true,
        describe: 'The device UDID of the targetted device',
      })
      .option('version', {
        alias: 'v',
        demand: true,
        describe: 'The iOS version of the targetted device (7.1.2, 8.0, ...)'
      })
      .option('webdriver', {
        alias: 'w',
        default: 'http://127.0.0.1:4723/wd/hub',
        describe: 'The URL to the Web Driver'
      });
  }

  argv = yargs.argv;
  var config = {
        framework: 'jasmine2',
        specs: [],
        capabilities: {},
        restartBrowserBetweenTests: true,
        onPrepare: 'FN_ONPREPARE_PLACEHOLDER',
        plugins: [{
          path: path.join(paths.e2e.pluginsToRoot, paths.e2e.plugins, 'wait_for_transitions.js')
        }]
      },
      i,
      configStr,
      onPrepare,
      users = {
        STUDENT: {
          LOGIN: 'student',
          PASSWORD: 'moodle'
        },
        TEACHER: {
          LOGIN: 'teacher',
          PASSWORD: 'moodle'
        },
        ADMIN: {
          LOGIN: 'admin',
          PASSWORD: 'test'
        }
      };

  // Preparing specs.
  for (i in paths.e2e.libs) {
    config.specs.push(path.join(paths.e2e.buildToRoot, paths.e2e.libs[i]));
  }
  for (i in paths.e2e.specs) {
    config.specs.push(path.join(paths.e2e.buildToRoot, paths.e2e.specs[i]));
  }

  // Browser.
  if (argv.target == 'browser') {
    config.seleniumAddress = argv.webdriver;
    config.capabilities.browserName = argv.browser;
    config.capabilities.chromeOptions = {
      args: ['--allow-file-access', '--allow-file-access-from-files', '--enable-local-file-accesses', '--unlimited-storage']
    };

  // Android.
  } else if (argv.target == 'android') {
    config.seleniumAddress = argv.webdriver;
    config.capabilities.app = path.join(__dirname, argv.apk);
    config.capabilities.browserName = '';
    config.capabilities.platformName = 'Android';
    config.capabilities.platformVersion = String(argv.version);
    config.capabilities.deviceName = 'Android Device';
    config.capabilities.udid = argv.device;
    config.capabilities.autoWebview = true;
    config.capabilities.autoWebviewTimeout = 10000;

  // iOS.
  } else if (argv.target == 'ios') {
    config.seleniumAddress = argv.webdriver;
    if (argv.ipa.charAt(0) === '/' || argv.ipa.charAt(0) === '\\') {
      config.capabilities.app = argv.ipa;
    } else {
      config.capabilities.app = path.join(__dirname, argv.ipa);
    }
    config.capabilities.browserName = 'iOS';
    config.capabilities.platformName = 'iOS';
    config.capabilities.platformVersion = String(argv.version);
    config.capabilities.deviceName = 'iOS Device';
    config.capabilities.udid = argv.device;
    config.capabilities.autoWebview = true;
    config.capabilities.autoWebviewTimeout = 10000;
  }

  // Prepend the onPrepare function.
  onPrepare = "" +
    "var wd = require('wd'),\n" +
    "    protractor = require('protractor'),\n" +
    "    wdBridge = require('wd-bridge')(protractor, wd);\n" +
    "wdBridge.initFromProtractor(exports.config);\n" +
    "\n" +
    "// Define global variables for our tests.\n" +
    "global.ISANDROID      = " + (argv.target == 'android' ? 'true' : 'false') + ";\n" +
    "global.ISBROWSER      = " + (argv.target == 'browser' ? 'true' : 'false') + ";\n" +
    "global.ISIOS          = " + (argv.target == 'ios' ? 'true' : 'false') + ";\n" +
    "global.ISTABLET       = " + (argv.tablet ? 'true' : 'false') + ";\n" +
    "global.DEVICEURL      = " + (argv.url ? "'" + argv.url + "'" : undefined) + ";\n" +
    "global.DEVICEVERSION  = " + (argv.version ? "'" + argv.version + "'" : 'undefined') + ";\n" +
    "global.SITEURL        = '" + (argv['site-url']) + "';\n" +
    "global.SITEVERSION    = " + (argv['site-version']) + ";\n" +
    "global.SITEHASLM      = " + (argv['site-has-local-mobile'] ? 'true' : 'false') + ";\n" +
    "global.USERS          = " + JSON.stringify(users) + ";\n" +
    "\n";

  configStr = JSON.stringify(config);
  configStr = configStr.replace('"FN_ONPREPARE_PLACEHOLDER"', "function(){" + onPrepare + "}");
  configStr = 'exports.config = ' + configStr + ';';

  gfile(argv.output, configStr, {src: true}).pipe(gulp.dest(paths.e2e.build));
});
