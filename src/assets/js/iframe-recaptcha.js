// (C) Copyright 2015 Moodle Pty Ltd.
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

(function () {
    var url = location.href;

    if (!url.match(/^https?:\/\//i) || !url.match(/\/webservice\/recaptcha\.php/i)) {
        // Not the recaptcha script, stop.
        return;
    }

    // Define recaptcha callbacks.
    window.recaptchacallback = function(value) {
        window.parent.postMessage({
            environment: 'moodleapp',
            context: 'recaptcha',
            action: 'callback',
            frameUrl: location.href,
            value: value,
        }, '*');
    };

    window.recaptchaexpiredcallback = function() {
        window.parent.postMessage({
            environment: 'moodleapp',
            context: 'recaptcha',
            action: 'expired',
            frameUrl: location.href,
        }, '*');
    };
})();