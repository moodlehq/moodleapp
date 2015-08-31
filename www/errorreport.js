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
window.onerror = function(msg, url, lineNumber) {
    var errorReported = false;

    function reportError() {
        if (!errorReported) {
            errorReported = true;
            var reportUrl = 'http://prototype.moodle.net/mobile/feedback/mmfeedback.php?message=' + encodeURIComponent(msg) +
                            '&file=' + encodeURIComponent(url) + '&line=' + lineNumber;

            if (window.device) {
                reportUrl = reportUrl + '&platform=' + window.device.platform + '&model=' + encodeURIComponent(window.device.model) +
                                      '&osversion=' + window.device.version + '&cordova=' + window.device.cordova;
            }
            if (window.location) {
                reportUrl = reportUrl + '&localurl=' + encodeURIComponent(window.location.href);
            }
            if (navigator.userAgent) {
                reportUrl = reportUrl + '&useragent=' + encodeURIComponent(navigator.userAgent);
            }
            if (ydn.db.Storage) {
                // Detect Storage type by default.
                var db = new ydn.db.Storage('test', {}, {});
                if (db && db.getType) {
                    reportUrl = reportUrl + '&storage=' + encodeURIComponent(db.getType());
                }
            }

            window.open(reportUrl, '_system');
        }
    }

    if (msg.indexOf('Can\'t find variable: cordova') == -1) {
        // Use setTimeout to prevent the following error if the app crashes right at the start:
        // "The connection to the server was unsuccessful. (file:///android_asset/www/index.html)"
        setTimeout(function() {
            if (typeof msg == "string") {
                var sendError,
                    confirmmsg = 'Unexpected error, please accept to report the bug so we can work on fixing it ' +
                                    '(Internet connection required).';

                sendError = confirm(confirmmsg);
                if (sendError) {
                    // Wait for device ready so we can retrieve device data. In most cases device will already be ready.
                    document.addEventListener('deviceready', reportError);
                    // Report error if device ready isn't fired after 5 seconds.
                    setTimeout(reportError, 5000);
                }
            }

            // This may help debugging if we use logging apps in iOs or Android.
            if (typeof console != "undefined" && typeof console.log == "function") {
                console.log(msg);
            }
        }, 100);
    }

    // Let default error handler run.
    return false;
};
