exports.config = {
    framework: "jasmine2",
    jasmineNodeOpts: {
        showColors: true,
        defaultTimeoutInterval: 100000,
        realtimeFailure: true,
        showTiming: true,
        includeStackTrace: true,
        isVerbose: true,
        onComplete: null
    },
    specs: [
        "../../e2e/*.js",
        "../../www/**/e2e/mod_assign.spec.js",
        "../../www/**/e2e/mod_book.spec.js",
        "../../www/**/e2e/mod_chat.spec.js",
        "../../www/**/e2e/mod_choice.spec.js"
    ],
    baseUrl: '',
    seleniumAddress: "http://" + process.env.SAUCE_USERNAME + ":" + process.env.SAUCE_ACCESS_KEY + "@ondemand.saucelabs.com:80/wd/hub",
    multiCapabilities: [{
        "deviceName": "Samsung Galaxy S4 Emulator",
        "name": "android",
        "appiumVersion": "1.5.3",
        "app": "https://s3.amazonaws.com/android.phonegap/production/apps/32ffc00c-1992-11e5-bfff-fa3e49515870/MoodleMobile-release.apk",
        "autoWebview": true,
        "platform": "Android",
        "browserName": "Android",
        "version": "4.4",
        "deviceOrientation": "portrait",
        "autoWebviewTimeout": 10000,
        "username": process.env.SAUCE_USERNAME,
        "accessKey": process.env.SAUCE_ACCESS_KEY
    }],
    restartBrowserBetweenTests: true,
    onPrepare: function () {
        var wd = require('wd'),
            protractor = require('protractor'),
            wdBridge = require('wd-bridge')(protractor, wd);
        wdBridge.initFromProtractor(exports.config);
        global.EC = protractor.ExpectedConditions;


        // Define global variables for our tests.
        global.ISANDROID = true;
        global.ISBROWSER = false;
        global.ISIOS = false;
        global.ISTABLET = false;
        global.DEVICEURL = 'http://localhost:8100/';
        global.DEVICEVERSION = undefined;
        global.SITEURL = 'http://school.demo.moodle.net';
        global.SITEVERSION = 3.3;
        global.SITEHASLM = false;
        global.USERS = {
            "STUDENT": {
                "LOGIN": "student",
                "PASSWORD": "moodle"
            },
            "TEACHER": {
                "LOGIN": "teacher",
                "PASSWORD": "moodle"
            },
            "ADMIN": {
                "LOGIN": "admin",
                "PASSWORD": "test"
            }
        };
    },
    getPageTimeout: 15000,
    plugins: [{
        "path": "../../e2e/plugins/wait_for_transitions.js"
    }]
};