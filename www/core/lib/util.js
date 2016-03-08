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

    var self = this, // Use 'self' to be coherent with the rest of services.
        provider = this; // To access provider methods from the service.

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

    this.$get = function($ionicLoading, $ionicPopup, $injector, $translate, $http, $log, $q, $mmLang, $mmFS, $timeout, $mmApp,
                $mmText, mmCoreWifiDownloadThreshold, mmCoreDownloadThreshold) {

        $log = $log.getInstance('$mmUtil');

        var self = {}; // Use 'self' to be coherent with the rest of services.

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
         * Returns if a URL is downloadable: plugin file OR theme/image.php OR gravatar.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#isDownloadableUrl
         * @param  {String}  url The URL to test.
         * @return {Boolean}     True when the URL is downloadable.
         */
        self.isDownloadableUrl = function(url) {
            return self.isPluginFileUrl(url) || self.isThemeImageUrl(url) || self.isGravatarUrl(url);
        };

        /**
         * Returns if a URL is a gravatar URL.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#isGravatarUrl
         * @param  {String}  url The URL to test.
         * @return {Boolean}     True when the URL is a gravatar URL.
         */
        self.isGravatarUrl = function(url) {
            return url && url.indexOf('gravatar.com/avatar') !== -1;
        };

        /**
         * Returns if a URL is a pluginfile URL.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#isPluginFileUrl
         * @param  {String}  url The URL to test.
         * @return {Boolean}     True when the URL is a pluginfile URL.
         */
        self.isPluginFileUrl = function(url) {
            return url && url.indexOf('/pluginfile.php') !== -1;
        };

        /**
         * Returns if a URL is a theme image URL.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#isThemeImageUrl
         * @param  {String}  url The URL to test.
         * @return {Boolean}     True when the URL is a theme image URL.
         */
        self.isThemeImageUrl = function(url) {
            return url && url.indexOf('/theme/image.php') !== -1;
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
            return /^http(s)?\:\/\/.+/i.test(url);
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
            if (url.indexOf('?file=') != -1 || url.indexOf('?forcedownload=') != -1 || url.indexOf('?rev=') != -1) {
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
            var deferred = $q.defer();

            if (false) {
                // TODO Restore node-webkit support.

                // Link is the file path in the file system.
                // We use the node-webkit shell for open the file (pdf, doc) using the default application configured in the os.
                // var gui = require('nw.gui');
                // gui.Shell.openItem(path);
                deferred.resolve();

            } else if (window.plugins) {
                var extension = $mmFS.getFileExtension(path),
                    mimetype = $mmFS.getMimeType(extension);

                if (ionic.Platform.isAndroid() && window.plugins.webintent) {
                    var iParams = {
                        action: "android.intent.action.VIEW",
                        url: path,
                        type: mimetype
                    };

                    window.plugins.webintent.startActivity(
                        iParams,
                        function() {
                            $log.debug('Intent launched');
                            deferred.resolve();
                        },
                        function() {
                            $log.debug('Intent launching failed.');
                            $log.debug('action: ' + iParams.action);
                            $log.debug('url: ' + iParams.url);
                            $log.debug('type: ' + iParams.type);

                            if (!extension || extension.indexOf('/') > -1 || extension.indexOf('\\') > -1) {
                                // Extension not found.
                                $mmLang.translateAndRejectDeferred(deferred, 'mm.core.erroropenfilenoextension');
                            } else {
                                $mmLang.translateAndRejectDeferred(deferred, 'mm.core.erroropenfilenoapp');
                            }
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
                                deferred.resolve();
                            },
                            function(error) {
                                $log.debug('Error opening with handleDocumentWithURL' + path);
                                if(error == 53) {
                                    $log.error('No app that handles this file type.');
                                }
                                self.openInBrowser(path);
                                deferred.resolve();
                            },
                            path
                        );
                    }, deferred.reject);
                } else {
                    // Last try, launch the file with the browser.
                    self.openInBrowser(path);
                    deferred.resolve();
                }
            } else {
                // Changing _blank for _system may work in cordova 2.4 and onwards.
                $log.debug('Opening external file using window.open()');
                window.open(path, '_blank');
                deferred.resolve();
            }

            return deferred.promise;
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
         * Open a URL using InAppBrowser.
         *
         * Do not use for files, refer to {@link $mmUtil#openFile}.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#openInApp
         * @param  {String} url The URL to open.
         * @return {Void}
         */
        self.openInApp = function(url) {
            window.open(url, '_blank');
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
                langKeys = [errorKey],
                matches;

            if (angular.isObject(errorMessage)) {
                // We received an object instead of a string. Search for common properties.
                if (typeof errorMessage.content != 'undefined') {
                    errorMessage = errorMessage.content;
                } else if (typeof errorMessage.body != 'undefined') {
                    errorMessage = errorMessage.body;
                } else if (typeof errorMessage.message != 'undefined') {
                    errorMessage = errorMessage.message;
                } else if (typeof errorMessage.error != 'undefined') {
                    errorMessage = errorMessage.error;
                } else {
                    // No common properties found, just stringify it.
                    errorMessage = JSON.stringify(errorMessage);
                }

                // Try to remove tokens from the contents.
                matches = errorMessage.match(/token"?[=|:]"?(\w*)/, '');
                if (matches && matches[1]) {
                    errorMessage = errorMessage.replace(new RegExp(matches[1], 'g'), 'secret');
                }
            }

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
         * Show a prompt modal to input some data.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#showPrompt
         * @param  {String} body             Modal body.
         * @param  {String} title            Modal title.
         * @param  {String} inputPlaceholder Placeholder of the input box. By default, "Password".
         * @param  {String} [inputType]      Type of the input box. By default, password.
         * @return {Promise}                 Promise resolved with the input data if the user clicks OK, rejected if cancels.
         */
        self.showPrompt = function(body, title, inputPlaceholder, inputType) {
            inputType = inputType || 'password';

            var options = {
                template: body,
                title: title,
                inputPlaceholder: inputPlaceholder,
                inputType: inputType
            };
            return $ionicPopup.prompt(options).then(function(data) {
                if (typeof data == 'undefined') {
                    return $q.reject();
                }
                return data;
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

        /**
         * Similar to $q.all, but if a promise fails this function's promise won't be rejected until ALL promises have finished.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#allPromises
         * @param  {Promise[]} promises Promises.
         * @return {Promise}            Promise resolved if all promises are resolved and rejected if at least 1 promise fails.
         */
        self.allPromises = function(promises) {
            if (!promises || !promises.length) {
                return $q.when();
            }

            var count = 0,
                failed = false,
                deferred = $q.defer();

            angular.forEach(promises, function(promise) {
                promise.catch(function() {
                    failed = true;
                }).finally(function() {
                    count++;

                    if (count === promises.length) {
                        // All promises have finished, reject/resolve.
                        if (failed) {
                            deferred.reject();
                        } else {
                            deferred.resolve();
                        }
                    }
                });
            });

            return deferred.promise;
        };

        /**
         * Compare two objects. This function won't compare functions and proto properties, it's a basic compare.
         * Also, this will only check if itemA's properties are in itemB with same value. This function will still
         * return true if itemB has more properties than itemA.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#basicLeftCompare
         * @param {Mixed}  itemA         First object.
         * @param {Mixed}  itemB         Second object.
         * @param {Number} [maxLevels=0] Number of levels to reach if 2 objects are compared.
         * @param {Number} [level=0]     Current deep level (when comparing objects).
         * @return {Boolean}             True if equal, false otherwise.
         */
        self.basicLeftCompare = function(itemA, itemB, maxLevels, level) {
            level = level || 0;
            maxLevels = maxLevels || 0;

            if (angular.isFunction(itemA) || angular.isFunction(itemB)) {
                return true; // Don't compare functions.
            } else if (angular.isObject(itemA) && angular.isObject(itemB)) {
                if (level >= maxLevels) {
                    return true; // Max deep reached.
                }

                var equal = true;
                angular.forEach(itemA, function(value, name) {
                    if (!self.basicLeftCompare(value, itemB[name], maxLevels, level + 1)) {
                        equal = false;
                    }
                });
                return equal;
            } else {
                // We'll treat "2" and 2 as the same value.
                var floatA = parseFloat(itemA),
                    floatB = parseFloat(itemB);

                if (!isNaN(floatA) && !isNaN(floatB)) {
                    return floatA == floatB;
                }
                return itemA === itemB;
            }
        };

        /**
         * If the download size is higher than a certain threshold shows a confirm dialog.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#confirmDownloadSize
         * @param {Number} size                 Size to download (in bytes).
         * @param {String} [message]            Code of the message to show. Default: 'mm.course.confirmdownload'.
         * @param {String} [unknownsizemessage] Code of the message to show if size is unknown.
         *                                      Default: 'mm.course.confirmdownloadunknownsize'.
         * @param {Number} [wifiThreshold]      Threshold to show confirm in WiFi connection. Default: mmCoreWifiDownloadThreshold.
         * @param {Number} [limitedThreshold]   Threshold to show confirm in limited connection. Default: mmCoreDownloadThreshold.
         * @return {Promise}                   Promise resolved when the user confirms or if no confirm needed.
         */
        self.confirmDownloadSize = function(size, message, unknownsizemessage, wifiThreshold, limitedThreshold) {
            wifiThreshold = typeof wifiThreshold == 'undefined' ? mmCoreWifiDownloadThreshold : wifiThreshold;
            limitedThreshold = typeof limitedThreshold == 'undefined' ? mmCoreDownloadThreshold : limitedThreshold;
            message = message || 'mm.course.confirmdownload';
            unknownsizemessage = unknownsizemessage || 'mm.course.confirmdownloadunknownsize';

            if (size <= 0) {
                // Seems size was unable to be calculated. Show a warning.
                return self.showConfirm($translate(unknownsizemessage));
            }
            else if (size >= wifiThreshold || ($mmApp.isNetworkAccessLimited() && size >= limitedThreshold)) {
                var readableSize = $mmText.bytesToSize(size, 2);
                return self.showConfirm($translate(message, {size: readableSize}));
            }
            return $q.when();
        };

        /**
         * Formats a size to be used as width/height of an element.
         * If the size is already valid (like '500px' or '50%') it won't be modified.
         * Returned size will have a format like '500px'.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#formatPixelsSize
         * @param  {Mixed} size Size to format.
         * @return {String}     Formatted size. If size is not valid, returns an empty string.
         */
        self.formatPixelsSize = function(size) {
            if (typeof size == 'string' && (size.indexOf('px') > -1 || size.indexOf('%') > -1)) {
                // It seems to be a valid size.
                return size;
            }

            size = parseInt(size, 10);
            if (!isNaN(size)) {
                return size + 'px';
            }
            return '';
        };

        /**
         * Serialize an object to be used in a request.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#param
         * @param  {Object} obj Object to serialize.
         * @return {String}     Serialization of the object.
         */
        self.param = function(obj) {
            return provider.param(obj);
        };

        /**
         * Rounds a number to use a certain amout of decimals or less.
         * Difference between this function and float's toFixed:
         * 7.toFixed(2) -> 7.00
         * roundToDecimals(7, 2) -> 7
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#roundToDecimals
         * @param  {Float}  number       Float to round.
         * @param  {Number} [decimals=2] Number of decimals. By default, 2.
         * @return {Float}               Rounded number.
         */
        self.roundToDecimals = function(number, decimals) {
            if (typeof decimals == 'undefined') {
                decimals = 2;
            }

            var multiplier = Math.pow(10, decimals);
            return Math.round(parseFloat(number) * multiplier) / multiplier;
        };

        /**
         * Extracts the parameters from a URL and stores them in an object.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#extractUrlParams
         * @param  {String} url URL to treat.
         * @return {Object}     Object with the params.
         */
        self.extractUrlParams = function(url) {
            var regex = /[?&]+([^=&]+)=?([^&]*)?/gi,
                params = {};
            url.replace(regex, function(match, key, value) {
                params[key] = value !== undefined ? value : '';
            });
            return params;
        };

        /**
         * Given an HTML, searched all links and media and tries to restore original sources using the paths object.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#restoreSourcesInHtml
         * @param  {String} html         HTML code.
         * @param  {Object} paths        Object linking URLs in the html code with the real URLs to use.
         * @param  {Function} [anchorFn] Function to call with each anchor. Optional.
         * @return {String}              Treated HTML code.
         */
        self.restoreSourcesInHtml = function(html, paths, anchorFn) {
            var div = angular.element('<div>'),
                media;
            div.html(html);

            // Treat img, audio, video and source.
            media = div[0].querySelectorAll('img, video, audio, source');
            angular.forEach(media, function(el) {
                var src = paths[decodeURIComponent(el.getAttribute('src'))];
                if (typeof src !== 'undefined') {
                    el.setAttribute('src', src);
                }
            });

            // We do the same for links.
            angular.forEach(div.find('a'), function(anchor) {
                var href = decodeURIComponent(anchor.getAttribute('href')),
                    url = paths[href];

                if (typeof url !== 'undefined') {
                    anchor.setAttribute('href', url);

                    if (angular.isFunction(anchorFn)) {
                        anchorFn(anchor, href);
                    }
                }
            });

            return div.html();
        };

        return self;
    };
});
