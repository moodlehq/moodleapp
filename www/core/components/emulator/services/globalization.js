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

angular.module('mm.core.emulator')

/**
 * This service handles the emulation of the Cordova Globalization plugin in desktop apps and in browser.
 *
 * @ngdoc service
 * @name $mmEmulatorGlobalization
 * @module mm.core.emulator
 */
.factory('$mmEmulatorGlobalization', function($log, $q, $window, $mmApp) {

    $log = $log.getInstance('$mmEmulatorGlobalization');

    var self = {};

    /**
     * Get the current locale.
     *
     * @return {String} Locale.
     */
    function getLocale() {
        var navLang = navigator.userLanguage || navigator.language;
        try {
            if ($mmApp.isDesktop()) {
                var locale = require('electron').remote.app.getLocale();
                return locale || navLang;
            } else {
                return navLang;
            }
        } catch(ex) {
            // Something went wrong, return browser language.
            return navLang;
        }
    }

    /**
     * Load the emulation of the Cordova plugin.
     * Only some of the functions are supported.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorGlobalization#load
     * @return {Promise} Promise resolved when done.
     */
    self.load = function() {
        // Create the GlobalizationError object.
        $window.GlobalizationError = function(code, message) {
            this.code = code || null;
            this.message = message || '';
        };

        $window.GlobalizationError.UNKNOWN_ERROR = 0;
        $window.GlobalizationError.FORMATTING_ERROR = 1;
        $window.GlobalizationError.PARSING_ERROR = 2;
        $window.GlobalizationError.PATTERN_ERROR = 3;

        // Create the Globalization object.
        navigator.globalization = {
            getLocaleName: function(successCallback, errorCallback) {
                var locale = getLocale();
                if (locale) {
                    successCallback && successCallback({value: locale});
                } else {
                    var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Cannot get language');
                    errorCallback && errorCallback(error);
                }
            },
            numberToString: function(number, successCallback, errorCallback, options) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            isDayLightSavingsTime: function(date, successCallback, errorCallback) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            getFirstDayOfWeek: function(successCallback, errorCallback) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            getDateNames: function (successCallback, errorCallback, options) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            getDatePattern: function(successCallback, errorCallback, options) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            getNumberPattern: function(successCallback, errorCallback, options) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            getCurrencyPattern: function(currencyCode, successCallback, errorCallback) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            stringToDate: function(dateString, successCallback, errorCallback, options) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            stringToNumber: function(numberString, successCallback, errorCallback, options) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
            dateToString: function(date, successCallback, errorCallback, options) {
                var error = new GlobalizationError(GlobalizationError.UNKNOWN_ERROR, 'Not supported.');
                errorCallback && errorCallback(error);
            },
        };

        navigator.globalization.getPreferredLanguage = navigator.globalization.getLocaleName;

        return $q.when();
    };

    return self;
});
