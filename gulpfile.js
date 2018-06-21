var gulp = require('gulp'),
    fs = require('fs'),
    through = require('through'),
    rename = require('gulp-rename'),
    path = require('path'),
    slash = require('gulp-slash'),
    clipEmptyFiles = require('gulp-clip-empty-files'),
    gutil = require('gulp-util'),
    flatten = require('gulp-flatten'),
    npmPath = require('path'),
    File = gutil.File,
    license = '' +
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
        var path = file.path.substr(file.path.lastIndexOf('/src/') + 5);
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
        var pathSplit = filepath.split('/');

        pathSplit.pop();

        switch (pathSplit[0]) {
            case 'lang':
                prefix = 'core';
                break;
            case 'core':
                if (pathSplit[1] == 'lang') {
                    // Not used right now.
                    prefix = 'core';
                } else {
                    prefix = 'core.' + pathSplit[1];
                }
                break;
            case 'addon':
                // Remove final item 'lang'.
                pathSplit.pop();
                // Remove first item 'addon'.
                pathSplit.shift();

                // For subplugins. We'll use plugin_subfolder_subfolder2_...
                // E.g. 'mod_assign_feedback_comments'.
                prefix = 'addon.' + pathSplit.join('_');
                break;
            case 'assets':
                prefix = 'assets.' + pathSplit[1];
                break;
        }

        if (prefix) {
            addProperties(merged, data[filepath], prefix + '.');
        }
    }

    // Force ordering by string key.
    Object.keys(merged).sort().forEach(function(k){
        mergedOrdered[k] = merged[k];
    });

    return new Buffer(JSON.stringify(mergedOrdered, null, 4));
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
            .pipe(slash())
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

// List of app lang files. To be used only if cannot get it from filesystem.
var appLangFiles = ['ar.json', 'bg.json', 'ca.json', 'cs.json', 'da.json', 'de.json', 'en.json', 'es-mx.json', 'es.json', 'eu.json',
    'fa.json', 'fr.json', 'he.json', 'hu.json', 'it.json', 'ja.json', 'nl.json', 'pl.json', 'pt-br.json', 'pt.json', 'ro.json',
    'ru.json', 'sv.json', 'tr.json', 'zh-cn.json', 'zh-tw.json'],
    paths = {
        src: './src',
        assets: './src/assets',
        lang: [
            './src/lang/',
            './src/core/**/lang/',
            './src/addon/**/lang/',
            './src/assets/countries/',
            './src/assets/mimetypes/'
        ],
        config: './src/config.json',
    };

gulp.task('default', ['lang', 'config']);

gulp.task('watch', function() {
    var langsPaths = paths.lang.map(function(path) {
        return path + '*.json';
    });
    gulp.watch(langsPaths, { interval: 500 }, ['lang']);
    gulp.watch(paths.config, { interval: 500 }, ['config']);
});

// Build the language files into a single file per language.
gulp.task('lang', function(done) {
    // Get filenames to know which languages are available.
    var filenames = getFilenames(paths.lang[0]);

    buildLangs(filenames, paths.lang, path.join(paths.assets, 'lang'), done);
});

// Convert config.json into a TypeScript class.
gulp.task('config', function(done) {
    gulp.src(paths.config)
        .pipe(through(function(file) {
            // Convert the contents of the file into a TypeScript class.
            // Disable the rule variable-name in the file.
            var config = JSON.parse(file.contents.toString()),
                contents = license + '// tslint:disable: variable-name\n' + 'export class CoreConfigConstants {\n';

            for (var key in config) {
                var value = config[key];
                if (typeof value == 'string') {
                    // Wrap the string in ' .
                    value = "'" + value + "'";
                } else if (typeof value != 'number' && typeof value != 'boolean') {
                    // Stringify with 4 spaces of indentation, and then add 4 more spaces in each line.
                    value = JSON.stringify(value, null, 4).replace(/^(?:    )/gm, '        ').replace(/^(?:})/gm, '    }');
                    // Replace " by ' in values.
                    value = value.replace(/: "([^"]*)"/g, ": '$1'");

                    // Check if the keys have "-" in it.
                    var matches = value.match(/"([^"]*\-[^"]*)":/g);
                    if (matches) {
                        // Replace " by ' in keys. We cannot remove them because keys have chars like '-'.
                        value = value.replace(/"([^"]*)":/g, "'$1':");
                    } else {
                        // Remove ' in keys.
                        value = value.replace(/"([^"]*)":/g, "$1:");
                    }

                    // Add type any to the key.
                    key = key + ': any';
                }

                // If key has quotation marks, remove them.
                if (key[0] == '"') {
                    key = key.substr(1, key.length - 2);
                }
                contents += '    static ' + key + ' = ' + value + ';\n';
            }
            contents += '}\n';

            file.contents = new Buffer(contents);
            this.emit('data', file);
        }))
        .pipe(rename('configconstants.ts'))
        .pipe(gulp.dest(paths.src))
        .on('end', done);
});

var templatesSrc = [
        './src/components/**/*.html',
        './src/core/**/components/**/*.html',
        './src/core/**/component/**/*.html',
        // Copy all addon components because any component can be injected using extraImports.
        './src/addon/**/components/**/*.html',
        './src/addon/**/component/**/*.html'
    ],
    templatesDest = './www/templates';

// Copy component templates to www to make compile-html work in AOT.
gulp.task('copy-component-templates', function(done) {
    deleteFolderRecursive(templatesDest);

    gulp.src(templatesSrc)
        .pipe(flatten())
        .pipe(gulp.dest(templatesDest))
        .on('end', done);
});

