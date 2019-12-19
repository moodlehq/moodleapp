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
    concat = require('gulp-concat'),
    bufferFrom = require('buffer-from')
    File = gutil.File,
    exec = require('child_process').exec,
    license = '' +
        '// (C) Copyright 2015 Moodle Pty Ltd.\n' +
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
        var srcPos = file.path.lastIndexOf('/src/');
        if (srcPos == -1) {
            // It's probably a Windows environment.
            srcPos = file.path.lastIndexOf('\\src\\');
        }

        var path = file.path.substr(srcPos + 5);
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
        var pathSplit = filepath.split(/[\/\\]/),
            prefix;

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

    return bufferFrom(JSON.stringify(mergedOrdered, null, 4));
}

/**
 * Build lang file.
 *
 * @param  {String} language    Language to translate.
 * @param  {String[]} langPaths Paths to the possible language files.
 * @param  {String}   buildDest Path where to leave the built files.
 * @param  {Function} done      Function to call when done.
 * @return {Void}
 */
function buildLang(language, langPaths, buildDest, done) {
    var filename = language + '.json',
        data = {},
        firstFile = null;

    var paths = langPaths.map(function(path) {
        if (path.slice(-1) != '/') {
            path = path + '/';
        }
        return path + language + '.json';
    });

    gulp.src(paths, { allowEmpty: true })
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
        .on('end', done);
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
var paths = {
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

// Build the language files into a single file per language.
gulp.task('lang', function(done) {
    buildLang('en', paths.lang, path.join(paths.assets, 'lang'), done);
});

// Convert config.json into a TypeScript class.
gulp.task('config', function(done) {
    // Get the last commit.
    exec('git log -1 --pretty=format:"%H"', function (err, commit, stderr) {
        if (err) {
            console.error('An error occurred while getting the last commit: ' + err);
        } else if (stderr) {
            console.error('An error occurred while getting the last commit: ' + stderr);
        }

        gulp.src(paths.config)
            .pipe(through(function(file) {
                // Convert the contents of the file into a TypeScript class.
                // Disable the rule variable-name in the file.
                var config = JSON.parse(file.contents.toString()),
                    contents = license + '// tslint:disable: variable-name\n' + 'export class CoreConfigConstants {\n',
                    that = this;

                for (var key in config) {
                    var value = config[key];
                    if (typeof value == 'string') {
                        // Wrap the string in ' and scape them.
                        value = "'" + value.replace(/([^\\])'/g, "$1\\'") + "'";
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

                // Add compilation info.
                contents += '    static compilationtime = ' + Date.now() + ';\n';
                contents += '    static lastcommit = \'' + commit + '\';\n';

                contents += '}\n';

                file.contents = bufferFrom(contents);
                this.emit('data', file);
            }))
            .pipe(rename('configconstants.ts'))
            .pipe(gulp.dest(paths.src))
            .on('end', done);
    });
});

gulp.task('default', gulp.parallel('lang', 'config'));

gulp.task('watch', function() {
    var langsPaths = paths.lang.map(function(path) {
        return path + 'en.json';
    });
    gulp.watch(langsPaths, { interval: 500 }, gulp.parallel('lang'));
    gulp.watch(paths.config, { interval: 500 }, gulp.parallel('config'));
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

    gulp.src(templatesSrc, { allowEmpty: true })
        .pipe(flatten())
        .pipe(gulp.dest(templatesDest))
        .on('end', done);
});

/**
 * Finds the file and returns its content.
 *
 * @param  {string} capture     Import file path.
 * @param  {string} baseDir     Directory where the file was found.
 * @param  {string} paths       Alternative paths where to find the imports.
 * @param  {Array} parsedFiles  Yet parsed files to reduce size of the result.
 * @return {string}             Partially combined scss.
 */
function getReplace(capture, baseDir, paths, parsedFiles) {
    var parse   = path.parse(path.resolve(baseDir, capture + '.scss'));
    var file    = parse.dir + '/' + parse.name;


    if (!fs.existsSync(file + '.scss')) {
        // File not found, might be a partial file.
        file    = parse.dir + '/_' + parse.name;
    }

    // If file still not found, try to find the file in the alternative paths.
    var x = 0;
    while (!fs.existsSync(file + '.scss') && paths.length > x) {
        parse   = path.parse(path.resolve(paths[x], capture + '.scss'));
        file    = parse.dir + '/' + parse.name;

        x++;
    }

    file    = file + '.scss';

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
    var text = fs.readFileSync(file);

    // Recursive call.
    return scssCombine(text, parse.dir, paths, parsedFiles);
}

/**
 * Combine scss files with its imports
 *
 * @param  {string} content     Scss string to read.
 * @param  {string} baseDir     Directory where the file was found.
 * @param  {string} paths       Alternative paths where to find the imports.
 * @param  {Array} parsedFiles  Yet parsed files to reduce size of the result.
 * @return {string}             Scss string with the replaces done.
 */
function scssCombine(content, baseDir, paths, parsedFiles) {

    // Content is a Buffer, convert to string.
    if (typeof content != "string") {
        content = content.toString();
    }

    // Search of single imports.
    var regex = /@import[ ]*['"](.*)['"][ ]*;/g;

    if (regex.test(content)) {
        return content.replace(regex, function(m, capture) {
            if (capture == "bmma") {
                return m;
            }

            return getReplace(capture, baseDir, paths, parsedFiles);
        });
    }

    // Search of multiple imports.
    regex = /@import(?:[ \n]+['"](.*)['"][,]?[ \n]*)+;/gm;
    if (regex.test(content)) {
        return content.replace(regex, function(m, capture) {
            var text = "";

            // Divide the import into multiple files.
            regex = /['"]([^'"]*)['"]/g;
            var captures = m.match(regex);
            for (var x in captures) {
                text += getReplace(captures[x].replace(/['"]+/g, ''), baseDir, paths, parsedFiles) + "\n";
            }

            return text;
        });
    }

    return content;
}

gulp.task('combine-scss', function(done) {
    var paths = [
        'node_modules/ionic-angular/themes/',
        'node_modules/font-awesome/scss/',
        'node_modules/ionicons/dist/scss/'
    ];

    var parsedFiles = [];

    gulp.src([
            './src/theme/variables.scss',
            './node_modules/ionic-angular/themes/ionic.globals.*.scss',
            './node_modules/ionic-angular/themes/ionic.components.scss',
            './src/**/*.scss'])  // define a source files
        .pipe(through(function(file, encoding, callback) {
            if (file.isNull()) {
                return;
            }

            parsedFiles.push(file);
            file.contents = bufferFrom(scssCombine(file.contents, path.dirname(file.path), paths, parsedFiles));

            this.emit('data', file);
        }))   // combine them based on @import and save it to stream
        .pipe(concat('combined.scss')) // concat the stream output in single file
        .pipe(gulp.dest('.'))  // save file to destination.
        .on('end', done);
});
