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

angular.module('mm.core')

/**
 * Provider with some 'util' functionalities.
 *
 * @module mm.core
 * @ngdoc provider
 * @name $mmUtil
 */
.provider('$mmUtil', function() {

    /**
     * Serialize an object to be used in a request.
     *
     * @param  {Object} obj Object to serialize.
     * @return {String}     Serialization of the object.
     */
    this.param = function(obj) {
        var query = '', name, value, fullSubName, subName, subValue, innerObj, i;

        for (name in obj) {
            value = obj[name];

            if (value instanceof Array) {
                for (i = 0; i < value.length; ++i) {
                    subValue = value[i];
                    fullSubName = name + '[' + i + ']';
                    innerObj = {};
                    innerObj[fullSubName] = subValue;
                    query += this.param(innerObj) + '&';
                }
            }
            else if (value instanceof Object) {
                for (subName in value) {
                    subValue = value[subName];
                    fullSubName = name + '[' + subName + ']';
                    innerObj = {};
                    innerObj[fullSubName] = subValue;
                    query += this.param(innerObj) + '&';
                }
            }
            else if (value !== undefined && value !== null) query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
        }

        return query.length ? query.substr(0, query.length - 1) : query;
    };

    function mmUtil($mmSite, $ionicLoading, $ionicPopup, $translate) {

        /**
         * Formats a URL, trim, lowercase, etc...
         * @param  {str} url The url to be formatted
         * @return {str}     The url formatted
         */
        this.formatURL = function(url) {

            url = url.trim();

            // Check if the URL starts by http or https.
            if (! /^http(s)?\:\/\/.*/i.test(url)) {
                // Test first allways https.
                url = "https://" + url;
            }

            // http allways in lowercase.
            url = url.replace(/^http/i, 'http');
            url = url.replace(/^https/i, 'https');

            // Replace last slash.
            url = url.replace(/\/$/, "");

            return url;
        };

        /**
         * Validates a URL for a specific pattern.
         * @param {String} url The url to test against the pattern
         * @return {bool} TRUE if the url matches the expected pattern.
         *                FALSE otherwise.
         */
        this.isValidURL = function(url) {
            return /^http(s)?\:\/\/([\da-zA-Z\.-]+)\.([\da-zA-Z\.]{2,6})([\/\w \.-]*)*\/?/i.test(url);
        };

        /**
         * Generic function for adding the wstoken to Moodle urls and for pointing to the correct script.
         * For download remote files from Moodle we need to use the special /webservice/pluginfile passing
         * the ws token as a get parameter.
         *
         * @param {String} url   The url to be fixed.
         * @param {String} token Token to use. If not set, use the current site token.
         */
        this.fixPluginfile = function(url, token) {

            // This function is used in regexp callbacks, better not to risk!!
            if (!url) {
                return '';
            }

            // First check if we need to fix this url or is already fixed.
            if (url.indexOf('token=') != -1) {
                return url;
            }

            // Check if is a valid URL (contains the pluginfile endpoint).
            if (url.indexOf('pluginfile') == -1) {
                return url;
            }

            if (!token) {
                // Get current site token.
                token = $mmSite.getCurrentSiteToken();
                if (!token) {
                    return '';
                }
            }

            // In which way the server is serving the files? Are we using slash parameters?
            if (url.indexOf('?file=') != -1) {
                url += '&';
            } else {
                url += '?';
            }
            url += 'token=' + token;

            // Some webservices returns directly the correct download url, others not.
            if (url.indexOf('/webservice/pluginfile') == -1) {
                url = url.replace('/pluginfile', '/webservice/pluginfile');
            }
            return url;
        };

        /**
         * Displays a loading modal window
         *
         * @param {string} title The text of the modal window
         */
        this.showModalLoading = function(text) {
            $ionicLoading.show({
                template: '<i class="icon ion-load-c">'+text
            });
        };

        /**
         * Close a modal loading window
         */
        this.closeModalLoading = function() {
            $ionicLoading.hide();
        };

        /**
         * Show a modal with an error message.
         *
         * @param {String} errorMessage Message to show.
         * @param {Boolean} needsTranslate True if the errorMessage is a $translate key, false otherwise.
         */
        this.showErrorModal = function(errorMessage, needsTranslate) {
            var langKeys = ['error'];
            if (needsTranslate) {
                langKeys.push(errorMessage);
            }

            $translate(langKeys).then(function(translations) {
                $ionicPopup.alert({
                    title: translations.error,
                    template: needsTranslate ? translations[errorMessage] : errorMessage
                });
            });
        };

        /**
         * Function for clean HTML tags
         * @param  {str} text The text to be cleaned
         * @return {str}      Text cleaned
         */
        this.cleanTags = function(text) {
            // First, we use a regexpr.
            text = text.replace(/(<([^>]+)>)/ig,"");
            // Then, we rely on the browser. We need to wrap the text to be sure is HTML.
            // text = $("<p>" + text + "</p>").text();
            // Recover new lines.
            text = text.replace(/(?:\r\n|\r|\n)/g, '<br />');
            return text;
        };

        /**
         * Checks if the current device is a phone (by screen size).
         *
         * @return {Boolean} True if the device is a phone, false otherwise.
         */
        this.isPhone = function() {
            var mq = 'only screen and (min-width: 768px) and (-webkit-min-device-pixel-ratio: 1)';
            return !matchMedia(mq).matches;
        };
    }

    this.$get = function($mmSite, $ionicLoading, $ionicPopup, $translate) {
        return new mmUtil($mmSite, $ionicLoading, $ionicPopup, $translate);
    };
});
