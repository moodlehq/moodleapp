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
.provider('$mmUtil', function(mmCoreSecondsYear, mmCoreSecondsDay, mmCoreSecondsHour, mmCoreSecondsMinute) {

    var self = this; // Use 'self' to be coherent with the rest of services.

    /**
     * Serialize an object to be used in a request.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmUtilProvider#param
     * @param  {Object} obj Object to serialize.
     * @return {String}     Serialization of the object.
     */
    self.param = function(obj) {
        var query = '', name, value, fullSubName, subName, subValue, innerObj, i;

        for (name in obj) {
            value = obj[name];

            if (value instanceof Array) {
                for (i = 0; i < value.length; ++i) {
                    subValue = value[i];
                    fullSubName = name + '[' + i + ']';
                    innerObj = {};
                    innerObj[fullSubName] = subValue;
                    query += self.param(innerObj) + '&';
                }
            }
            else if (value instanceof Object) {
                for (subName in value) {
                    subValue = value[subName];
                    fullSubName = name + '[' + subName + ']';
                    innerObj = {};
                    innerObj[fullSubName] = subValue;
                    query += self.param(innerObj) + '&';
                }
            }
            else if (value !== undefined && value !== null) query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
        }

        return query.length ? query.substr(0, query.length - 1) : query;
    };

    this.$get = function($ionicLoading, $ionicPopup, $injector, $translate, $http, $log, $q, $mmLang, $mmFS, $timeout) {

        $log = $log.getInstance('$mmUtil');

        var self = {}; // Use 'self' to be coherent with the rest of services.

        // // Loading all the mimetypes.
        var mimeTypes = {};
        $http.get('core/assets/mimetypes.json').then(function(response) {
            mimeTypes = response.data;
        }, function() {
            // It failed, never mind...
        });

        /**
         * Formats a URL, trim, lowercase, etc...
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#formatURL
         * @param  {String} url The url to be formatted.
         * @return {String}     Fromatted url.
         */
        self.formatURL = function(url) {

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
         * Resolves an object.
         *
         * @description
         * This is used to resolve what a callback should be when attached to a delegate.
         * For instance, if the object attached is a function, it is returned as is, but
         * we also support complex definition of objects. If we receive a string we will parse
         * it and to inject its service using $injector from Angular.
         *
         * Examples:
         * - (Function): returns the same function.
         * - (Object): returns the same object.
         * - '$mmSomething': Injects and returns $mmSomething.
         * - '$mmSomething.method': Injectes and returns a reference to the function 'method'.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#resolveObject
         * @param  {Mixed} object String, object or function.
         * @param  {Boolean} [instantiate=false] When true, if the object resolved is a function, instantiates it.
         * @return {Object} The reference to the object resolved.
         */
        self.resolveObject = function(object, instantiate) {
            var toInject,
                resolved;

            instantiate = angular.isUndefined(instantiate) ? false : instantiate;

            if (angular.isFunction(object) || angular.isObject(object)) {
                resolved = object;

            } else if (angular.isString(object)) {
                toInject = object.split('.');
                resolved = $injector.get(toInject[0]);

                if (toInject.length > 1) {
                    resolved = resolved[toInject[1]];
                }
            }

            if (angular.isFunction(resolved) && instantiate) {
                resolved = resolved();
            }

            if (typeof resolved === 'undefined') {
                throw new Error('Unexpected argument passed passed');
            }
            return resolved;
        };

        /**
         * Returns the file extension of a file.
         *
         * When the file does not have an extension, it returns undefined.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#getFileExtension
         * @param  {string} filename The file name.
         * @return {string}          The lowercased extension, or undefined.
         */
        self.getFileExtension = function(filename) {
            var dot = filename.lastIndexOf("."),
                ext;

            if (dot > -1) {
                ext = filename.substr(dot + 1).toLowerCase();
            }

            return ext;
        };

        /**
         * Get a file icon URL based on its file name.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#getFileIcon
         * @param  {String} The name of the file.
         * @return {String} The path to a file icon.
         */
        self.getFileIcon = function(filename) {
            var ext = self.getFileExtension(filename),
                icon;

            if (ext && mimeTypes[ext] && mimeTypes[ext].icon) {
                icon = mimeTypes[ext].icon + '-64.png';
            } else {
                icon = 'unknown-64.png';
            }

            return 'img/files/' + icon;
        };

        /**
         * Get the folder icon URL.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#getFolderIcon
         * @return {String} The path to a folder icon.
         */
        self.getFolderIcon = function() {
            return 'img/files/folder-64.png';
        };

        /**
         * Returns if a URL is a pluginfile URL.
         *
         * @param  {String}  url The URL to test.
         * @return {Boolean}     True when the URL is a pluginfile URL.
         */
        self.isPluginFileUrl = function(url) {
            return url && (url.indexOf('/pluginfile.php') !== -1);
        };

        /**
         * Validates a URL for a specific pattern.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#isValidURL
         * @param {String} url The url to test against the pattern
         * @return {Boolean}   TRUE if the url matches the expected pattern.
         *                     FALSE otherwise.
         */
        self.isValidURL = function(url) {
            return /^http(s)?\:\/\/([\da-zA-Z\.-]+)\.([\da-zA-Z\.]{2,6})([\/\w \.-]*)*\/?/i.test(url);
        };

        /**
         * Generic function for adding the wstoken to Moodle urls and for pointing to the correct script.
         * For download remote files from Moodle we need to use the special /webservice/pluginfile passing
         * the ws token as a get parameter.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#fixPluginfileURL
         * @param {String} url   The url to be fixed.
         * @param {String} token Token to use.
         * @return {String}      Fixed URL.
         */
        self.fixPluginfileURL = function(url, token) {

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
                return '';
            }

            // In which way the server is serving the files? Are we using slash parameters?
            if (url.indexOf('?file=') != -1 || url.indexOf('?forcedownload=') != -1) {
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
         * Open a file using platform specific method.
         *
         * node-webkit: Using the default application configured.
         * Android: Using the WebIntent plugin.
         * iOs: Using the window.open method.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#openFile
         * @param  {String} path The local path of the file to be open.
         * @return {Void}
         */
        self.openFile = function(path) {

            if (false) {
                // TODO Restore node-webkit support.

                // Link is the file path in the file system.
                // We use the node-webkit shell for open the file (pdf, doc) using the default application configured in the os.
                // var gui = require('nw.gui');
                // gui.Shell.openItem(path);

            } else if (window.plugins) {
                var extension = self.getFileExtension(path),
                    mimetype;

                if (extension && mimeTypes[extension]) {
                    mimetype = mimeTypes[extension];
                }

                if (ionic.Platform.isAndroid() && window.plugins.webintent) {
                    var iParams = {
                        action: "android.intent.action.VIEW",
                        url: path,
                        type: mimetype.type
                    };

                    window.plugins.webintent.startActivity(
                        iParams,
                        function() {
                            $log.debug('Intent launched');
                        },
                        function() {
                            $log.debug('Intent launching failed');
                            $log.debug('action: ' + iParams.action);
                            $log.debug('url: ' + iParams.url);
                            $log.debug('type: ' + iParams.type);
                            // This may work in cordova 2.4 and onwards.
                            window.open(path, '_system');
                        }
                    );

                } else if (ionic.Platform.isIOS() && typeof handleDocumentWithURL == 'function') {

                    $mmFS.getBasePath().then(function(fsRoot) {
                        // Encode/decode the specific file path, note that a path may contain directories
                        // with white spaces, special characters...
                        if (path.indexOf(fsRoot > -1)) {
                            path = path.replace(fsRoot, "");
                            path = encodeURIComponent(decodeURIComponent(path));
                            path = fsRoot + path;
                        }

                        handleDocumentWithURL(
                            function() {
                                $log.debug('File opened with handleDocumentWithURL' + path);
                            },
                            function(error) {
                                $log.debug('Error opening with handleDocumentWithURL' + path);
                                if(error == 53) {
                                    $log.error('No app that handles this file type.');
                                }
                                self.openInBrowser(path);
                            },
                            path
                        );
                    });
                } else {
                    // Last try, launch the file with the browser.
                    self.openInBrowser(path);
                }
            } else {
                // Changing _blank for _system may work in cordova 2.4 and onwards.
                $log.debug('Opening external file using window.open()');
                window.open(path, '_blank');
            }
        };

        /**
         * Open a URL using a browser.
         *
         * Do not use for files, refer to {@link $mmUtil#openFile}.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#openInBrowser
         * @param  {String} url The URL to open.
         * @return {Void}
         */
        self.openInBrowser = function(url) {
            window.open(url, '_system');
        };

        /**
         * Displays a loading modal window.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#showModalLoading
         * @param {String}  text           The text of the modal window.
         * @param {Boolean} needsTranslate True if the 'text' is a $translate key, false otherwise.
         * @return {Object}                Object with a 'dismiss' function to close the modal.
         * @description
         * Usage:
         *     var modal = $mmUtil.showModalLoading(myText);
         *     ...
         *     modal.dismiss();
         */
        self.showModalLoading = function(text, needsTranslate) {
            var modalClosed = false,
                modalShown = false;

            if (!text) {
                text = 'mm.core.loading';
                needsTranslate = true;
            }

            function showModal(text) {
                if (!modalClosed) {
                    $ionicLoading.show({
                        template:   '<ion-spinner></ion-spinner>' +
                                    '<p>'+text+'</p>'
                    });
                    modalShown = true;
                }
            }

            if (needsTranslate) {
                $translate(text).then(showModal);
            } else {
                showModal(text);
            }

            return {
                dismiss: function() {
                    modalClosed = true;
                    if (modalShown) {
                        $ionicLoading.hide();
                    }
                }
            };
        };

        /**
         * Show a modal with an error message.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#showErrorModal
         * @param {String} errorMessage    Message to show.
         * @param {Boolean} needsTranslate True if the errorMessage is a $translate key, false otherwise.
         * @param {Number} [autocloseTime] Number of milliseconds to wait to close the modal.
         *                                 If not defined, modal won't be automatically closed.
         */
        self.showErrorModal = function(errorMessage, needsTranslate, autocloseTime) {
            var errorKey = 'mm.core.error',
                langKeys = [errorKey];

            if (needsTranslate) {
                langKeys.push(errorMessage);
            }

            $translate(langKeys).then(function(translations) {
                var popup = $ionicPopup.alert({
                    title: translations[errorKey],
                    template: needsTranslate ? translations[errorMessage] : errorMessage
                });

                if (typeof autocloseTime != 'undefined' && !isNaN(parseInt(autocloseTime))) {
                    $timeout(function() {
                        popup.close();
                    }, parseInt(autocloseTime));
                } else {
                    delete popup;
                }
            });
        };

        /**
         * Show a modal with an error message.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#showModal
         * @param {String} title        Language key.
         * @param {String} message      Language key.
         */
        self.showModal = function(title, message) {
            var promises = [
                $translate(title),
                $translate(message),
            ];

            $q.all(promises).then(function(translations) {
                $ionicPopup.alert({
                    title: translations[0],
                    template: translations[1]
                });
            });
        };

        /**
         * Show a confirm modal.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#showConfirm
         * @param  {Mixed} template Template to show in the modal body. Can be a string or a promise.
         * @return {Promise}        Promise resolved if the user confirms and rejected if he cancels.
         */
        self.showConfirm = function(template, title) {
            return $ionicPopup.confirm({template: template, title: title}).then(function(confirmed) {
                if (!confirmed) {
                    return $q.reject();
                }
            });
        };

        /**
         * Reads and parses a JSON file.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#readJSONFile
         * @param  {String} path Path to the file.
         * @return {Promise}     Promise to be resolved when the file is parsed.
         */
        self.readJSONFile = function(path) {
            return $http.get(path).then(function(response) {
                return response.data;
            });
        };

        /**
         * Get country name based on country code.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#getCountryName
         * @param {String} code Country code (AF, ES, US, ...).
         * @return {String}     Country name. If the country is not found, return the country code.
         */
        self.getCountryName = function(code) {
            var countryKey = 'mm.core.country-' + code,
                countryName = $translate.instant(countryKey);

            return countryName !== countryKey ? countryName : code;
        };

        /**
         * Returns the URL to the documentation of the app, based on Moodle version and current language.
         *
         * @param {String} [release] Moodle release.
         * @param {String} [page]    Docs page to go to.
         * @return {Promise}         Promise resolved with the Moodle docs URL.
         */
        self.getDocsUrl = function(release, page) {
            page = page || 'Mobile_app';

            var docsurl = 'https://docs.moodle.org/en/' + page;

            if (typeof release != 'undefined') {
                var version = release.substr(0, 3).replace(".", "");
                // Check is a valid number.
                if (parseInt(version) >= 24) {
                    // Append release number.
                    docsurl = docsurl.replace('https://docs.moodle.org/', 'https://docs.moodle.org/' + version + '/');
                }
            }

            return $mmLang.getCurrentLanguage().then(function(lang) {
                return docsurl.replace('/en/', '/' + lang + '/');
            }, function() {
                return docsurl;
            });
        };

        /**
         * Return the current timestamp (UNIX format, seconds).
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#timestamp
         * @return {Number} The current timestamp in seconds.
         */
        self.timestamp = function() {
            return Math.round(new Date().getTime() / 1000);
        };

        /**
         * Return true if the param is false (bool), 0 (number) or "0" (string).
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#isFalseOrZero
         * @param {Mixed} value Value to check.
         * @return {Number}     True if value is false, 0 or "0".
         */
        self.isFalseOrZero = function(value) {
            return typeof value != 'undefined' && (value === false || parseInt(value) === 0);
        };

        /**
         * Return true if the param is true (bool), 1 (number) or "1" (string).
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#isTrueOrOne
         * @param {Mixed} value Value to check.
         * @return {Number}     True if value is true, 1 or "1".
         */
        self.isTrueOrOne = function(value) {
            return typeof value != 'undefined' && (value === true || parseInt(value) === 1);
        };

        /**
         * Returns hours, minutes and seconds in a human readable format
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#formatTime
         * @param  {Integer} seconds A number of seconds
         * @return {String}         Human readable seconds formatted
         */
        self.formatTime = function(seconds) {
            var langKeys = ['mm.core.day', 'mm.core.days', 'mm.core.hour', 'mm.core.hours', 'mm.core.min', 'mm.core.mins',
                            'mm.core.sec', 'mm.core.secs', 'mm.core.year', 'mm.core.years', 'mm.core.now'];

            return $translate(langKeys).then(function(translations) {

                totalSecs = Math.abs(seconds);

                var years     = Math.floor(totalSecs / mmCoreSecondsYear);
                var remainder = totalSecs - (years * mmCoreSecondsYear);
                var days      = Math.floor(remainder / mmCoreSecondsDay);
                remainder = totalSecs - (days * mmCoreSecondsDay);
                var hours     = Math.floor(remainder / mmCoreSecondsHour);
                remainder = remainder - (hours * mmCoreSecondsHour);
                var mins      = Math.floor(remainder / mmCoreSecondsMinute);
                var secs      = remainder - (mins * mmCoreSecondsMinute);

                var ss = (secs == 1)  ? translations['mm.core.sec']  : translations['mm.core.secs'];
                var sm = (mins == 1)  ? translations['mm.core.min']  : translations['mm.core.mins'];
                var sh = (hours == 1) ? translations['mm.core.hour'] : translations['mm.core.hours'];
                var sd = (days == 1)  ? translations['mm.core.day']  : translations['mm.core.days'];
                var sy = (years == 1) ? translations['mm.core.year'] : translations['mm.core.years'];

                var oyears = '',
                    odays = '',
                    ohours = '',
                    omins = '',
                    osecs = '';

                if (years) {
                    oyears  = years + ' ' + sy;
                }
                if (days) {
                    odays  = days + ' ' + sd;
                }
                if (hours) {
                    ohours = hours + ' ' + sh;
                }
                if (mins) {
                    omins  = mins + ' ' + sm;
                }
                if (secs) {
                    osecs  = secs + ' ' + ss;
                }

                if (years) {
                    return oyears + ' ' + odays;
                }
                if (days) {
                    return odays + ' ' + ohours;
                }
                if (hours) {
                    return ohours + ' ' + omins;
                }
                if (mins) {
                    return omins + ' ' + osecs;
                }
                if (secs) {
                    return osecs;
                }
                return translations['mm.core.now'];
            });
        };

        /**
         * Empties an array without losing its reference.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#emptyArray
         * @param  {Array} array Array to empty.
         */
        self.emptyArray = function(array) {
            array.length = 0; // Empty array without losing its reference.
        };

        return self;
    };
});
