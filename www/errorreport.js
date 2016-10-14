// (C) Copyright 2015 Martin Dougiamas
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// We use this code for handling unexpected errors.
// Using JS confirm function we are sure that the user get notified in a Mobile device.
// This script should be added at the begining of the index.html and it should only use native javascript functions.

var appVersion = '3.1.3 (2015)',
    reportInBackgroundName = 'mmCoreReportInBackground',
    errors = [],
    ignoredFiles = ['www/index.html#/site/mod_page', 'www/index.html#/site/mod_resource', 'www/index.html#/site/mm_course-section'];

/**
 * Check if error should be reported in background. If setting is not set, a confirm modal will be shown.
 *
 * @return {Boolean} True if should be reported in background, false otherwise.
 */
function shouldReportInBackground() {
    var inBackground = false,
        flag;

    if (localStorage && localStorage.getItem && localStorage.setItem) {
        flag = localStorage.getItem(reportInBackgroundName);
        if (isNaN(parseInt(flag, 10))) {
            // Flag not set. Show a confirm modal.
            var confirmmsg = 'Do you want to report errors automatically? Reporting errors will help us fixing them. ' +
                                'You can change this setting in App Settings.';
            inBackground = confirm(confirmmsg);
            localStorage.setItem(reportInBackgroundName, inBackground ? '1' : '0');
        } else {
            inBackground = flag === '1';
        }
    }

    return inBackground;
}

window.onerror = function(msg, url, lineNumber) {
    try {
        var errorReported = false,
            reportedOnDBReady = false,
            reportInBackground = false;

        /**
         * Add the storage type to the error report and send it.
         *
         * @param  {String} reportUrl URL to report the error.
         * @param  {Object} db        DB.
         */
        function getStorageAndReport(reportUrl, db) {
            if (!reportedOnDBReady) {
                reportedOnDBReady = true;
                reportUrl = reportUrl + '&storage=' + encodeURIComponent(db.getType());
                sendError(reportUrl);
            }
        }

        /**
         * Gather the needed data to report an error and reports it.
         */
        function reportError() {
            if (!errorReported) {
                errorReported = true;
                var reportUrl = 'http://prototype.moodle.net/mobile/feedback/mmfeedback.php?message=' + encodeURIComponent(msg) +
                                '&file=' + encodeURIComponent(url) + '&line=' + encodeURIComponent(lineNumber) + '&appv=' +
                                encodeURIComponent(appVersion) + '&bg=' + (reportInBackground ? 1 : 0);

                if (window.device) {
                    reportUrl = reportUrl + '&platform=' + encodeURIComponent(window.device.platform) +
                                        '&model=' + encodeURIComponent(window.device.model) +
                                        '&osversion=' + encodeURIComponent(window.device.version) +
                                        '&cordova=' + encodeURIComponent(window.device.cordova);
                }
                if (window.location) {
                    reportUrl = reportUrl + '&localurl=' + encodeURIComponent(window.location.href);
                }
                if (navigator.userAgent) {
                    reportUrl = reportUrl + '&useragent=' + encodeURIComponent(navigator.userAgent);
                }
                if (typeof ydn != 'undefined' && ydn.db && ydn.db.Storage) {
                    // Detect Storage type by default.
                    var db = new ydn.db.Storage('test', {}, {});
                    if (db && db.getType && db.onReady) {
                        db.onReady(function() {
                            getStorageAndReport(reportUrl, db);
                        });
                        setTimeout(function() {
                            getStorageAndReport(reportUrl, db);
                        }, 1000);
                        return;
                    }
                }

                sendError(reportUrl);
            }
        }

        /**
         * Send error to the server.
         *
         * @param  {String} reportUrl URL to report the error.
         */
        function sendError(reportUrl) {
            if (reportInBackground) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', reportUrl, true);
                xhr.send();
            } else {
                window.open(reportUrl, '_system');
            }
        }

        /**
         * Check if an error should be ignored.
         *
         * @return {Boolean} True if error should be ignored, false otherwise.
         */
        function shouldBeIgnored() {
            for (var i = 0; i < ignoredFiles.length; i++) {
                if (url.indexOf(ignoredFiles[i]) > -1) {
                    return true;
                }
            }
            return false;
        }

        if (errors.indexOf(msg) == -1 && !shouldBeIgnored()) {
            // Error hasn't happened yet.
            errors.push(msg);
            reportInBackground = shouldReportInBackground();

            // Use setTimeout to prevent the following error if the app crashes right at the start:
            // "The connection to the server was unsuccessful. (file:///android_asset/www/index.html)"
            setTimeout(function() {
                if (typeof msg == "string") {
                    var send = true,
                        confirmmsg = 'Unexpected error, please accept to report the bug so we can work on fixing it ' +
                                        '(Internet connection required).';

                    if (!reportInBackground) {
                        send = confirm(confirmmsg);
                    }

                    if (send) {
                        // Wait for device ready so we can retrieve device data. In most cases device will already be ready.
                        document.addEventListener('deviceready', reportError);
                        // Report error if device ready isn't fired after 5 seconds.
                        setTimeout(reportError, 5000);
                    }
                }
            }, 100);
        }

        // This may help debugging if we use logging apps in iOs or Android.
        if (typeof console != "undefined" && typeof console.log == "function") {
            console.log(msg);
        }
    } catch(ex) {
        // Something bad happened.
    }

    // Let default error handler run.
    return false;
};
