var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var insert = require('gulp-insert');
var stripComments = require('gulp-strip-comments');
var removeEmptyLines = require('gulp-remove-empty-lines');
var clipEmptyFiles = require('gulp-clip-empty-files');
var sass = require('gulp-sass');
var cleanCSS = require('gulp-clean-css');
var rename = require('gulp-rename');
var tap = require('gulp-tap');
var fs = require('fs');
var through = require('through');
var npmPath = require('path');
var gfile = require('gulp-file');
var File = gutil.File;
var gulpSlash = require('gulp-slash');
var ngAnnotate = require('gulp-ng-annotate');
var yargs = require('yargs');
var zip = require('gulp-zip');
var clean = require('gulp-clean');

// Given a list of paths to search and the path to an addon, return the list of paths to search only inside the addon folder.
function getRemoteAddonPaths(paths, pathToAddon) {
  if (!paths) {
    return [];
  }

  var result = [],
    pathToPackageFolder = npmPath.join(pathToAddon, remoteAddonPackageFolder);

  paths.forEach(function(path) {
    // Search only inside the addon folder.
    // Check if the path needs to be ignored.
    if (path[0] == '!') {
      result.push('!' + npmPath.join(pathToAddon, path.substr(1)));
    } else {
      result.push(npmPath.join(pathToAddon, path));
      // Ignore the files inside the addon "package" (tmp) folder.
      result.push('!' + npmPath.join(pathToPackageFolder, path));
    }
  });

  return result;
}

// Get the names of the JSON files inside a directory.
function getFilenames(dir) {
  if (fs.existsSync(dir)) {
    return fs.readdirSync(dir).filter(function(file) {
      return file.indexOf('.json') > -1;
    });
  } else {
    return [];
  }
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
 * Treats a file to merge JSONs. This function is based on gulp-jsoncombine module.
 * https://github.com/reflog/gulp-jsoncombine
 * @param  {Object} file File treated.
 */
function treatFile(file, data) {
  if (file.isNull() || file.isStream()) {
    return; // ignore
  }
  try {
    var path = file.path.substr(file.path.lastIndexOf('/www/') + 5);
    data[path] = JSON.parse(file.contents.toString());
  } catch (err) {
    console.log('Error parsing JSON: ' + err);
  }
}

/**
 * Treats the merged JSON data, adding prefixes depending on the component. Used in lang tasks.
 *
 * @param  {Object} data Merged data.
 * @return {Buffer}      Buffer with the treated data.
 */
function treatMergedData(data) {
  var merged = {};
  var mergedOrdered = {};

  for (var filepath in data) {

    if (filepath.indexOf('core/lang') === 0) {

      addProperties(merged, data[filepath], 'mm.core.');

    } else if (filepath.indexOf('core/components') === 0) {

      var componentName = filepath.replace('core/components/', '');
      componentName = componentName.substr(0, componentName.indexOf('/'));
      addProperties(merged, data[filepath], 'mm.'+componentName+'.');

    } else if (filepath.indexOf('addons') === 0) {

      var split = filepath.split('/'),
        pluginName = split[1],
        index = 2;

      // Check if it's a subplugin. If so, we'll use plugin_subfolder_subfolder2_...
      // E.g. 'mod_assign_feedback_comments'.
      while (split[index] && split[index] != 'lang') {
        pluginName = pluginName + '_' + split[index];
        index++;
      }
      addProperties(merged, data[filepath], 'mma.'+pluginName+'.');

    } else if (filepath.indexOf('core/assets/countries') === 0) {

      addProperties(merged, data[filepath], 'mm.core.country-');

    } else if (filepath.indexOf('core/assets/mimetypes') === 0) {

      addProperties(merged, data[filepath], 'mm.core.mimetype-');

    }
  }

  // Force ordering by string key.
  Object.keys(merged).sort().forEach(function(k){
    mergedOrdered[k] = merged[k];
  });

  return new Buffer(JSON.stringify(mergedOrdered, null, 4));
}

/**
 * Create JS build file.
 *
 * @param  {String[]} jsPaths     List of paths to search JS files in.
 * @param  {String}   buildDest   Folder where to place the built file.
 * @param  {String}   buildFile   Name of the built file.
 * @param  {String}   license     License to append to the file.
 * @param  {Boolean}  buildingApp True if building the whole app, false if building an addon.
 * @param  {Object}   replace     Strings to replace in the built file. Keys are the strings to replace with the values.
 * @param  {Function} done        Function to call when done.
 * @return {Void}
 */
function buildJS(jsPaths, buildDest, buildFile, license, buildingApp, replace, done) {
  var dependencies = ["'mm.core'"],
      componentRegex = /core\/components\/([^\/]+)\/main.js/,
      pluginRegex = /addons\/([^\/]+)\/main.js/,
      subpluginRegex = /addons\/([^\/]+)\/([^\/]+)\/main.js/;

  gulp.src(jsPaths)
    .pipe(gulpSlash())
    .pipe(clipEmptyFiles())
    .pipe(tap(function(file) {
      if (buildingApp) {
        // Gather full list of dependencies to add to the main module.
        if (componentRegex.test(file.path)) {
          dependencies.push("'mm.core." + file.path.match(componentRegex)[1] + "'");
        } else if (pluginRegex.test(file.path)) {
          dependencies.push("'mm.addons." + file.path.match(pluginRegex)[1] + "'");
        } else if (subpluginRegex.test(file.path)) {
          // It's a subplugin, use plugin_subplugin to identify it.
          var matches = file.path.match(subpluginRegex);
          dependencies.push("'mm.addons." + matches[1] + '_' + matches[2] + "'");
        }
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
      if (buildingApp) {
        // Add dependencies to the main module.
        contents = contents.replace(
          "angular.module('mm', ['ionic'",
          "angular.module('mm', ['ionic', " + dependencies.join(', '));
      }
      if (replace) {
        // Replace contents.
        for (var key in replace) {
          contents = contents.replace(new RegExp(key, 'g'), replace[key]);
        }
      }
      return contents;
    }))
    .pipe(gulp.dest(buildDest))
    .on('end', done);
}

/**
 * Build lang files.
 *
 * @param  {String[]} filenames Names of the language files.
 * @param  {String[]} langPaths Paths to the possible language files.
 * @param  {String}   buildDest Path where to leave the built files.
 * @param  {Function} done      Function to call when done.
 * @return {Void}
 */
function buildLangs(filenames, langPaths, buildDest, done) {
  if (!filenames || !filenames.length) {
    // If no filenames supplied, stop. Maybe it's an empty lang folder.
    done();
    return;
  }

  var count = 0;

  function taskFinished() {
    count++;
    if (count == filenames.length) {
      done();
    }
  }

  // Now create the build files for each supported language.
  filenames.forEach(function(filename) {

    var language = filename.replace('.json', ''),
      data = {},
      firstFile = null;

    var paths = langPaths.map(function(path) {
      if (path.slice(-1) != '/') {
        path = path + '/';
      }
      return path + language + '.json';
    });

    gulp.src(paths)
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
          var joinedPath = npmPath.join(firstFile.base, language+'.json');

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
      .pipe(gulp.dest(buildDest))
      .on('end', taskFinished);
  });
}

// Delete a folder and all its contents.
function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file) {
      var curPath = npmPath.join(path, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });

    fs.rmdirSync(path);
  }
}

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
  buildFile = 'mm.bundle.js',
  remoteAddonPackageFolder = 'rapackage', // Temporary folder where to store files while packaging.
  remoteAddonBuildFile = 'addon.js',
  remoteAddonStylesFile = 'styles.css',
  // List of app lang files. To be used only if cannot get it from filesystem.
  appLangFiles = ['ar.json', 'bg.json', 'ca.json', 'cs.json', 'da.json', 'de.json', 'en.json', 'es-mx.json', 'es.json', 'eu.json',
    'fa.json', 'fr.json', 'he.json', 'hu.json', 'it.json', 'ja.json', 'nl.json', 'pl.json', 'pt-br.json', 'pt.json', 'ro.json',
    'ru.json', 'sv.json', 'tr.json', 'zh-cn.json', 'zh-tw.json'];

var paths = {
  build: './www/build',
  js: [
    './www/app.js',
    './www/core/main.js',
    './www/core/lib/*.js',
    './www/core/filters/*.js',
    './www/core/directives/*.js',
    './www/core/components/*/main.js', // Don't use **/main.js to ensure that top level main.js are executed before lower ones.
    './www/core/components/*/*/main.js',
    './www/core/components/*/*/*/main.js',
    './www/core/components/*/*/*/*/main.js',
    './www/core/components/*/*/*/*/**/main.js', // It's unlikely there're more subaddons.
    './www/core/components/**/*.js',
    './www/addons/*/main.js', // Don't use **/main.js to ensure that top level main.js are executed before lower ones.
    './www/addons/*/*/main.js',
    './www/addons/*/*/*/main.js',
    './www/addons/*/*/*/*/main.js',
    './www/addons/*/*/*/*/**/main.js', // It's unlikely there're more subaddons.
    './www/addons/**/*.js',
    '!./www/**/tests/*.js',
    '!./www/**/e2e/*.js',
    '!./www/**/workers/*.js',
    '!./www/**/' + remoteAddonPackageFolder + '/*.js',
    '!./www/**/' + remoteAddonPackageFolder + '/**/*.js',
  ],
  sass: {
    core: [
      './www/core/scss/styles.scss',
      './www/core/scss/*.scss',
      './www/core/components/**/scss/*.scss',
      './www/addons/**/scss/*.scss',
      '!./www/**/' + remoteAddonPackageFolder + '/*.scss',
      '!./www/**/' + remoteAddonPackageFolder + '/**/*.scss',
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
    './www/core/assets/countries/',
    './www/core/assets/mimetypes/',
    '!./www/**/' + remoteAddonPackageFolder + '/*.json',
    '!./www/**/' + remoteAddonPackageFolder + '/**/*.json',
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

var remoteAddonPaths = {
  all: [
    '*',
    '**/*',
    '!e2e/*',
    '!**/e2e/*',
  ],
  js: [ // Treat main.js files first.
    '*/main.js',
    '**/main.js',
    '*.js',
    '**/*.js',
    '!e2e/*.js',
    '!**/e2e/*.js',
  ],
  sass: [
    '*.scss',
    '**/*.scss',
  ],
  lang: [
    'lang/',
  ]
};

gulp.task('default', ['build', 'sass', 'lang', 'config']);

gulp.task('serve:before', ['default', 'watch']);

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
    .pipe(cleanCSS({
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
  buildJS(paths.js, paths.build, buildFile, license, true, {}, done);
});

gulp.task('lang', function(done) {

  // Get filenames to know which languages are available.
  var filenames = getFilenames(paths.lang[0]);

  buildLangs(filenames, paths.lang, npmPath.join(paths.build, 'lang'), done);
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
    .option('filter', {
      alias: 'f',
      describe: 'To filter the tests to be executed (i.e www/messages/e2e/*)'
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
        getPageTimeout: 15000,  // Increase page fetching time out because of travis.
        plugins: [{
          path: npmPath.join(paths.e2e.pluginsToRoot, paths.e2e.plugins, 'wait_for_transitions.js')
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

  // Preparing specs. Checking first if we are filtering per specs.
  for (i in paths.e2e.libs) {
    config.specs.push(npmPath.join(paths.e2e.buildToRoot, paths.e2e.libs[i]));
  }

  if (argv.filter) {
    config.specs.push(npmPath.join(paths.e2e.buildToRoot, argv.filter));
  } else {
    for (i in paths.e2e.specs) {
      config.specs.push(npmPath.join(paths.e2e.buildToRoot, paths.e2e.specs[i]));
    }
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
    config.capabilities.app = npmPath.join(__dirname, argv.apk);
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
      config.capabilities.app = npmPath.join(__dirname, argv.ipa);
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
  onPrepare = "\n" +
    "        var wd = require('wd'),\n" +
    "        protractor = require('protractor'),\n" +
    "        wdBridge = require('wd-bridge')(protractor, wd);\n" +
    "        wdBridge.initFromProtractor(exports.config);\n" +
    "\n" +
    "        // Define global variables for our tests.\n" +
    "        global.ISANDROID      = " + (argv.target == 'android' ? 'true' : 'false') + ";\n" +
    "        global.ISBROWSER      = " + (argv.target == 'browser' ? 'true' : 'false') + ";\n" +
    "        global.ISIOS          = " + (argv.target == 'ios' ? 'true' : 'false') + ";\n" +
    "        global.ISTABLET       = " + (argv.tablet ? 'true' : 'false') + ";\n" +
    "        global.DEVICEURL      = " + (argv.url ? "'" + argv.url + "'" : undefined) + ";\n" +
    "        global.DEVICEVERSION  = " + (argv.version ? "'" + argv.version + "'" : 'undefined') + ";\n" +
    "        global.SITEURL        = '" + (argv['site-url']) + "';\n" +
    "        global.SITEVERSION    = " + (argv['site-version']) + ";\n" +
    "        global.SITEHASLM      = " + (argv['site-has-local-mobile'] ? 'true' : 'false') + ";\n" +
    "        global.USERS          = \n" + JSON.stringify(users, null, 4) + ";    \n" +
    "    ";

  configStr = JSON.stringify(config, null, 4);
  configStr = configStr.replace('"FN_ONPREPARE_PLACEHOLDER"', "function(){" + onPrepare + "}");
  configStr = 'exports.config = ' + configStr + ';';

  gfile(argv.output, configStr, {src: true}).pipe(gulp.dest(paths.e2e.build));
});

/** Remote addons packaging tasks */

// Treat params.
function treatRemoteAddonParams(yargs) {
  yargs = yargs
    .usage('gulp <task> --path <path> <options>')
    .option('path', {
      alias: 'p',
      describe: 'The path to the remote addon folder. Required param.'
    })
    .option('jspath', {
      alias: 'jsp',
      describe: "The path to replace in the JS files. If not provided it will be calculated using the 'path' option. Used in 'remoteaddon' and 'remoteaddon-build' tasks."
    })
    .option('output', {
      alias: 'o',
      describe: "Path to the output ZIP file. Used in 'remoteaddon' task. By default it will use the 'path' option and the addon folder name."
    })
    .option('help', {   // Fake the help option.
      alias: 'h',
      describe: 'Show help',
      type: 'boolean'
    });

  if (!yargs.argv.path) {
    yargs.showHelp();
    return false;
  }

  return yargs;
}

// Copy the files from a remoteaddon to the package folder.
gulp.task('remoteaddon-copy', function(done) {
  var path,
    sources,
    destFolder,
    newYargs = treatRemoteAddonParams(yargs);

  if (!newYargs) {
    return;
  }

  path = newYargs.argv.path || '';
  destFolder = npmPath.join(path, remoteAddonPackageFolder);
  sources = getRemoteAddonPaths(remoteAddonPaths.all, path);
  sources.push('!' + destFolder); // Don't copy dest folder.

  gulp.src(sources)
    .pipe(gulp.dest(destFolder))
    .on('end', done);
});

// Build JS file for remote addon.
gulp.task('remoteaddon-build', ['remoteaddon-copy'], function(done) {
  var path,
    pathToReplace,
    wildcard = '$ADDONPATH$',
    jsPaths,
    replace = {},
    newYargs = treatRemoteAddonParams(yargs);

  if (!newYargs) {
    return;
  }

  path = newYargs.argv.path || '';
  pathToReplace = newYargs.argv.jspath;
  if (typeof pathToReplace == 'undefined') {
    if (path.indexOf('www') === 0) {
      pathToReplace = path.replace(/www[\/\\]/, '');
    } else {
      pathToReplace = path;
    }
  }

  jsPaths = getRemoteAddonPaths(remoteAddonPaths.js, path);

  // Convert all backslash (\) to slash (/) to make it work in Windows.
  pathToReplace = pathToReplace.replace(/\\/g, '/');

  if (pathToReplace.slice(-1) == '/') {
    wildcard = wildcard + '/';
  }

  replace[pathToReplace] = wildcard;

  buildJS(jsPaths, npmPath.join(path, remoteAddonPackageFolder), remoteAddonBuildFile, '', false, replace, done);
});

// Build styles for remote addon.
gulp.task('remoteaddon-sass', ['remoteaddon-copy'], function(done) {
  var path,
    sassPaths,
    newYargs = treatRemoteAddonParams(yargs);

  if (!newYargs) {
    return;
  }

  path = newYargs.argv.path || '';
  sassPaths = getRemoteAddonPaths(remoteAddonPaths.sass, path);

  gulp.src(sassPaths)
    .pipe(concat(remoteAddonStylesFile))
    .pipe(sass())
    .pipe(gulp.dest(npmPath.join(path, remoteAddonPackageFolder)))
    .on('end', done);
});

// Treat language files.
gulp.task('remoteaddon-lang', ['remoteaddon-copy'], function(done) {
  var path,
    langPaths,
    filenames = [],
    appFilenames = [],
    addonPackagePath,
    buildDest,
    newYargs = treatRemoteAddonParams(yargs);

  if (!newYargs) {
    return;
  }

  path = newYargs.argv.path || '';
  langPaths = getRemoteAddonPaths(remoteAddonPaths.lang, path);
  addonPackagePath = npmPath.join(path, remoteAddonPackageFolder);
  buildDest = npmPath.join(addonPackagePath, 'lang');
  if (!fs.existsSync(langPaths[0])) {
    // No lang folder, stop.
    done();
    return;
  }

  // Get filenames to know which languages are available.
  filenames = filenames.concat(getFilenames(langPaths[0]));

  // Detect languages supported by the app but not by the addon. We'll create an empty file for them.
  if (fs.existsSync(paths.lang[0])) {
    appFilenames = getFilenames(paths.lang[0]);
  } else {
    appFilenames = appLangFiles;
  }

  appFilenames.forEach(function(appFilename) {
    if (filenames.indexOf(appFilename) == -1) {
      // Not supported. Create empty file.
      if (!fs.existsSync(buildDest)) {
          if (!fs.existsSync(addonPackagePath)) {
            fs.mkdirSync(addonPackagePath);
          }
          fs.mkdirSync(buildDest);
      }
      fs.writeFileSync(npmPath.join(buildDest, appFilename), '{}');
    }
  });

  buildLangs(filenames, langPaths, buildDest, done);
});

// Remote addons packaging.
gulp.task('remoteaddon', ['remoteaddon-build', 'remoteaddon-sass', 'remoteaddon-lang'], function(done) {
  var path,
    sources = [],
    outputFolder,
    zipName,
    pathToPackageFolder,
    newYargs = treatRemoteAddonParams(yargs);

  if (!newYargs) {
    return;
  }

  path = newYargs.argv.path || '';
  pathToPackageFolder = npmPath.join(path, remoteAddonPackageFolder);

  // Get or calculate output.
  if (typeof newYargs.argv.output != 'undefined') {
    zipName = npmPath.basename(newYargs.argv.output);
    if (zipName.indexOf('.') != -1) {
      // The user provided an extension, assume it's a file.
      outputFolder = npmPath.dirname(newYargs.argv.output);
    } else {
      // No extenson provided, assume it's a folder. We'll store the ZIP inside this folder.
      outputFolder = newYargs.argv.output;
      zipName = npmPath.basename(path);
    }
  } else {
    // Use 'path' and the addon folder name.
    outputFolder = path;
    zipName = npmPath.basename(path);
  }

  if (zipName.indexOf('.zip') == -1) {
    zipName += '.zip';
  }

  sources.push(npmPath.join(pathToPackageFolder, '*'));
  sources.push(npmPath.join(pathToPackageFolder, '**/*'));

  gulp.src(sources)
    .pipe(zip(zipName))
    .pipe(gulp.dest(outputFolder))
    .on('end', function() {
      // Remove package tmp dir.
      deleteFolderRecursive(pathToPackageFolder);
      done();
    });
});

// Cleans the development environment by deleting downloaded files and libraries
gulp.task('clean-libs', ['clean-www-libs', 'clean-ionic-platforms', 'clean-e2e-build', 'clean-sass-cache', 'clean-ionic-plugins']);

// Removes the contents in the /www/lib/ directory
gulp.task('clean-www-libs', function() {
  return gulp.src('www/lib/', {read: false})
    .pipe(clean());
});

// Removes the contents in the /platforms directory
gulp.task('clean-ionic-platforms', function() {
  return gulp.src('platforms/', {read: false})
    .pipe(clean());
});

// Removes the contents in the /plugins directory
gulp.task('clean-ionic-plugins', function() {
  return gulp.src('plugins/', {read: false})
    .pipe(clean());
});

// Removes the contents in the /www/build directory
gulp.task('clean-build', function() {
  return gulp.src('www/build/', {read: false})
    .pipe(clean());
});

// Removes the contents in the /e2e/build directory
gulp.task('clean-e2e-build', function() {
  return gulp.src('e2e/build/', {read: false})
    .pipe(clean());
});

// Removes the contents in the /.sass-cache directory
gulp.task('clean-sass-cache', function() {
  return gulp.src('.sass-cache/', {read: false})
    .pipe(clean());
});

// Removes the contents in the /node-modules directory
gulp.task('clean-node-modules', function() {
  return gulp.src('node_modules/', {read: false})
    .pipe(clean());
});
