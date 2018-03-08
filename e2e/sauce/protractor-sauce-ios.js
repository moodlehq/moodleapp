exports.config = {
    framework: "jasmine2",
    jasmineNodeOpts: {
        showColors: true,
        defaultTimeoutInterval: 2500000,
        realtimeFailure: true,
        showTiming: true,
        includeStackTrace: true,
        isVerbose: true,
        onComplete: null
    },
    specs: [
        "../../e2e/*.js",
        "../../../www/**/e2e/mod_chat.spec.js",
        "../../../www/**/e2e/mod_quiz.spec.js",
        "../../../www/**/e2e/mod_choice.spec.js",
        "../../../www/**/e2e/mod_assign.spec.js",
        "../../../www/**/e2e/mod_assign_teacher.spec.js",
        "../../../www/**/e2e/mod_forum.spec.js",
        "../../../www/**/e2e/mod_survey.spec.js",
        "../../../www/**/e2e/mod_forum_teacher.spec.js",
        "../../../www/**/e2e/mod_feedback.spec.js",
        "../../../www/**/e2e/mod_lesson.spec.js",
        "../../../www/**/e2e/mod_feedback_teacher.spec.js",
        "../../../www/**/e2e/mod_glossary.spec.js",
        "../../../www/**/e2e/mod_wiki.spec.js",
        "../../../www/**/e2e/mod_data.spec.js",
        "../../../www/**/e2e/mod_workshop.spec.js",
        "../../../www/**/e2e/notifications.spec.js",
        "../../../www/**/e2e/contacts.spec.js",
        "../../../www/**/e2e/messages.spec.js",
        "../../../www/**/e2e/login.spec.js",
        "../../../www/**/e2e/settings.spec.js",
        "../../../www/**/e2e/files.spec.js",
        "../../../www/**/e2e/notes.spec.js",
        "../../../www/**/e2e/calendar.spec.js",
        "../../../www/**/e2e/courses.spec.js",
        "../../../www/**/e2e/course_filtering.spec.js",
        "../../../www/**/e2e/grades.spec.js",
        "../../../www/**/e2e/participants.spec.js",
        "../../../www/**/e2e/coursecompletion.spec.js",
        "../../../www/**/e2e/course_contents.spec.js",
        "../../../www/**/e2e/overview.spec.js",
        "../../../www/**/e2e/mod_book.spec.js",
        "../../../www/**/e2e/mod_label.spec.js",
        "../../../www/**/e2e/mod_resource.spec.js",
        "../../../www/**/e2e/mod_folder.spec.js",
        "../../../www/**/e2e/mod_page.spec.js",
        "../../../www/**/e2e/mod_url.spec.js",
        "../../../www/**/e2e/module_prefetch.spec.js",
        "../../../www/**/e2e/teacher_grades.spec.js",
        "../../../www/**/e2e/teacher_new_staff_induction_course.spec.js",
        "../../../www/**/e2e/teacher_course.spec.js",
        "../../../www/**/e2e/teacher_participants.spec.js",
        "../../../www/**/e2e/user_profile.spec.js"
    ],
    baseUrl: '',
    seleniumAddress: "http://<username>:<accesskey>@ondemand.saucelabs.com:80/wd/hub",
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
        "username": "<username>",
        "accessKey": "<accesskey>"
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
        global.SITEVERSION = 3.4;
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
    getPageTimeout: 200000,
    plugins: [{
        "path": "../../e2e/plugins/wait_for_transitions.js"
    }]
};