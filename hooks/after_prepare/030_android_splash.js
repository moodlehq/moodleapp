#!/usr/bin/env node

// This hook copies Android splash screen files from dev directories into the appropriate platform specific location.
// The code was extracted from here: http://devgirl.org/2013/11/12/three-hooks-your-cordovaphonegap-project-needs/

var filesToCopy = [{
        'resources/android/splash/drawable-land-hdpi-screen.png': 'platforms/android/app/src/main/res/drawable-land-hdpi/screen.png'
    }, {
        'resources/android/splash/drawable-land-ldpi-screen.png': 'platforms/android/app/src/main/res/drawable-land-ldpi/screen.png'
    }, {
        'resources/android/splash/drawable-land-mdpi-screen.png': 'platforms/android/app/src/main/res/drawable-land-mdpi/screen.png'
    }, {
        'resources/android/splash/drawable-land-xhdpi-screen.png': 'platforms/android/app/src/main/res/drawable-land-xhdpi/screen.png'
    }, {
        'resources/android/splash/drawable-land-xxhdpi-screen.png': 'platforms/android/app/src/main/res/drawable-land-xxhdpi/screen.png'
    }, {
        'resources/android/splash/drawable-land-xxxhdpi-screen.png': 'platforms/android/app/src/main/res/drawable-land-xxxhdpi/screen.png'
    }, {
        'resources/android/splash/drawable-port-hdpi-screen.png': 'platforms/android/app/src/main/res/drawable-port-hdpi/screen.png'
    }, {
        'resources/android/splash/drawable-port-ldpi-screen.png': 'platforms/android/app/src/main/res/drawable-port-ldpi/screen.png'
    }, {
        'resources/android/splash/drawable-port-mdpi-screen.png': 'platforms/android/app/src/main/res/drawable-port-mdpi/screen.png'
    }, {
        'resources/android/splash/drawable-port-xhdpi-screen.png': 'platforms/android/app/src/main/res/drawable-port-xhdpi/screen.png'
    }, {
        'resources/android/splash/drawable-port-xxhdpi-screen.png': 'platforms/android/app/src/main/res/drawable-port-xxhdpi/screen.png'
    }, {
        'resources/android/splash/drawable-port-xxxhdpi-screen.png': 'platforms/android/app/src/main/res/drawable-port-xxxhdpi/screen.png'
    }
];

var fs = require('fs');
var path = require('path');

// no need to configure below
var rootDir = process.argv[2];

filesToCopy.forEach(function(obj) {
    Object.keys(obj).forEach(function(key) {
        var val = obj[key];
        var srcFile = path.join(rootDir, key);
        var destFile = path.join(rootDir, val);
        var destDir = path.dirname(destFile);
        if (fs.existsSync(srcFile) && fs.existsSync(destDir)) {
            fs.createReadStream(srcFile).pipe(fs.createWriteStream(destFile));
        }
    });
});
