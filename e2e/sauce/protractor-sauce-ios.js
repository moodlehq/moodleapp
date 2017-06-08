exports.config = {
    framework: "jasmine2",
    jasmineNodeOpts: {
        showColors: true,
        defaultTimeoutInterval: 1200000,
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
        "deviceName": "iPhone 6 Simulator",
        "name": "ios",
        "appiumVersion": "1.5.3",
        "app": "https://s3.amazonaws.com/ios.phonegap/production/apps/cbd27248-73e7-11e5-b902-22000ba180de/MoodleMobile.ipa",
        "autoWebview": true,
        "platformName": "iOS",
        "platformVersion": "9.3",
        "browserName": "",
        "deviceOrientation": "portrait",
        "autoWebviewTimeout": 120000,
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
        global.ISANDROID = false;
        global.ISBROWSER = false;
        global.ISIOS = true;
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