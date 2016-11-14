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
     * @param  {Object}     obj Object to serialize.
     * @param  {Boolean}    [addNull=false] Add null values to the serialized as empty parameters.
     * @return {String}     Serialization of the object.
     */
    self.param = function(obj, addNull) {
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
            } else if (value instanceof Object) {
                for (subName in value) {
                    subValue = value[subName];
                    fullSubName = name + '[' + subName + ']';
                    innerObj = {};
                    innerObj[fullSubName] = subValue;
                    query += self.param(innerObj) + '&';
                }
            } else if (addNull || (value !== undefined && value !== null)) {
                query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
            }
        }

        return query.length ? query.substr(0, query.length - 1) : query;
    };

    this.$get = function($ionicLoading, $ionicPopup, $injector, $translate, $http, $log, $q, $mmLang, $mmFS, $timeout, $mmApp,
                $mmText, mmCoreWifiDownloadThreshold, mmCoreDownloadThreshold, $ionicScrollDelegate, $mmWS, $cordovaInAppBrowser,
                $mmConfig, mmCoreSettingsRichTextEditor) {

        $log = $log.getInstance('$mmUtil');

        var self = {}, // Use 'self' to be coherent with the rest of services.
            matchesFn,
            inputSupportKeyboard = ['date', 'datetime', 'datetime-local', 'email', 'month', 'number', 'password',
                'search', 'tel', 'text', 'time', 'url', 'week'];

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
                throw new Error('Unexpected argument object passed');
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
         * iOs: Using handleDocumentWithURL.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#openFile
         * @param  {String} path The local path of the file to be open.
         * @return {Void}
         * @todo Restore node-webkit support.
         */
        self.openFile = function(path) {
            var deferred = $q.defer();

            if (window.plugins) {
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
         * @param  {Object} options Override default options passed to $cordovaInAppBrowser#open
         * @return {Void}
         */
        self.openInApp = function(url, options) {
            if (!url) {
                return;
            }

            options = options || {};

            if (!options.enableViewPortScale) {
                options.enableViewPortScale = 'yes'; // Enable zoom on iOS.
            }

            if (!options.location && ionic.Platform.isIOS() && url.indexOf('file://') === 0) {
                // The URL uses file protocol, don't show it on iOS.
                // In Android we keep it because otherwise we lose the whole toolbar.
                options.location = 'no';
            }

            $cordovaInAppBrowser.open(url, '_blank', options);
        };

        /**
         * Close the InAppBrowser window.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#closeInAppBrowser
         * @return {Void}
         */
        self.closeInAppBrowser = function() {
            $cordovaInAppBrowser.close();
        };

        /**
         * Open an online file using platform specific method.
         * Specially useful for audio and video since they can be streamed.
         *
         * node-webkit: Using the default application configured.
         * Android: Using the WebIntent plugin.
         * iOS: Using the window.open method (InAppBrowser)
         *      We don't use iOS quickview framework because it doesn't support streaming.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#openOnlineFile
         * @param  {String} url The URL of the file.
         * @return {Promise}    Promise resolved when opened.
         * @todo Restore node-webkit support.
         */
        self.openOnlineFile = function(url) {
            var deferred = $q.defer();

            if (ionic.Platform.isAndroid() && window.plugins && window.plugins.webintent) {
                // In Android we need the mimetype to open it.
                var extension,
                    iParams;

                $mmWS.getRemoteFileMimeType(url).then(function(mimetype) {
                    if (!mimetype) {
                        // Couldn't retireve mimetype. Try to guess it.
                        extension = $mmFS.guessExtensionFromUrl(url);
                        mimetype = $mmFS.getMimeType(extension);
                    }

                    iParams = {
                        action: "android.intent.action.VIEW",
                        url: url,
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
                });
            } else {
                $log.debug('Opening remote file using window.open()');
                window.open(url, '_blank');
                deferred.resolve();
            }

            return deferred.promise;
        };

        /**
         * Get the mimetype of a file given its URL. It'll perform a HEAD request to get it, if that
         * fails it'll try to guess it using the URL.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#getMimeType
         * @param  {String} url The URL of the file.
         * @return {Promise}    Promise resolved with the mimetype.
         */
        self.getMimeType = function(url) {
            return $mmWS.getRemoteFileMimeType(url).then(function(mimetype) {
                if (!mimetype) {
                    // Couldn't retireve mimetype. Try to guess it.
                    extension = $mmFS.guessExtensionFromUrl(url);
                    mimetype = $mmFS.getMimeType(extension);
                }
                return mimetype || '';
            });
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
                modalShown = false,
                showModalPromise;

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

                    // Leave some delay before setting modalShown to true.
                    // @todo In Ionic 1.3.1 $ionicLoading returns a promise, we should use that promise instead of a delay.
                    showModalPromise = $timeout(function() {
                        showModalPromise = null;
                        if (!modalClosed) {
                            modalShown = true;
                        }
                    }, 200);
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
                    if (showModalPromise) {
                        // Modal is being shown. Wait for it to be shown and hide it.
                        showModalPromise.finally(function() {
                            $ionicLoading.hide();
                        });
                    } else if (modalShown) {
                        // Modal shown, hide it.
                        $ionicLoading.hide();
                    }
                }
            };
        };

        /**
         * Displays a loading modal window using a certain template.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#showModalLoadingWithTemplate
         * @param {String} [template] Template to use in the modal.
         * @param {Object} [options]  Options. See http://ionicframework.com/docs/api/service/$ionicLoading/
         * @return {Object}           Object with a 'dismiss' function to close the modal.
         * @description
         * Usage:
         *     var modal = $mmUtil.showModalLoadingWithTemplate(template);
         *     ...
         *     modal.dismiss();
         */
        self.showModalLoadingWithTemplate = function(template, options) {
            options = options || {};

            if (!template) {
                template = "<ion-spinner></ion-spinner><p>{{'mm.core.loading' | translate}}</p>";
            }

            options.template = template;

            $ionicLoading.show(options);

            return {
                dismiss: function() {
                    $ionicLoading.hide();
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
         * @param  {Mixed} template   Template to show in the modal body. Can be a string or a promise.
         * @param  {String} [title]   Title of the modal.
         * @param  {Object} [options] More options. See http://ionicframework.com/docs/api/service/$ionicPopup/
         * @return {Promise}          Promise resolved if the user confirms and rejected if he cancels.
         */
        self.showConfirm = function(template, title, options) {
            options = options || {};

            options.template = template;
            options.title = title;
            return $ionicPopup.confirm(options).then(function(confirmed) {
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
         * Returns hours, minutes and seconds in a human readable format
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#formatDuration
         * @param  {Integer} duration       Duration in seconds
         * @param  {Integer} [precission]   Number of elements to have in precission. 0 or undefined to full precission.
         * @return {String}                 Full Human readable duration formatted
         */
        self.formatDuration = function(duration, precission) {
            eventDuration = moment.duration(duration, 'seconds');

            if (!precission) {
                precission = 5;
            }

            durationString = "";
            if (precission && eventDuration.years() > 0) {
                durationString += " " + moment.duration(eventDuration.years(), 'years').humanize();
                precission--;
            }
            if (precission && eventDuration.months() > 0) {
                durationString += " " + moment.duration(eventDuration.months(), 'months').humanize();
                precission--;
            }
            if (precission && eventDuration.days() > 0) {
                durationString += " " + moment.duration(eventDuration.days(), 'days').humanize();
                precission--;
            }
            if (precission && eventDuration.hours() > 0) {
                durationString += " " + moment.duration(eventDuration.hours(), 'hours').humanize();
                precission--;
            }
            if (precission && eventDuration.minutes() > 0) {
                durationString += " " + moment.duration(eventDuration.minutes(), 'minutes').humanize();
                precission--;
            }

            return durationString.trim();
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
         * Removes all properties from an object without losing its reference.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#emptyObject
         * @param {Object} object Object to remove the properties.
         */
        self.emptyObject = function(object) {
            for (var key in object) {
                if (object.hasOwnProperty(key)) {
                    delete object[key];
                }
            }
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
         * @param {Object|Number} sizeCalc      Containing size to download (in bytes) and a boolean to indicate if its
         *                                      totaly or partialy calculated.
         * @param {String} [message]            Code of the message to show. Default: 'mm.course.confirmdownload'.
         * @param {String} [unknownsizemessage] Code of the message to show if size is unknown.
         *                                      Default: 'mm.course.confirmdownloadunknownsize'.
         * @param {Number} [wifiThreshold]      Threshold to show confirm in WiFi connection. Default: mmCoreWifiDownloadThreshold.
         * @param {Number} [limitedThreshold]   Threshold to show confirm in limited connection. Default: mmCoreDownloadThreshold.
         * @return {Promise}                   Promise resolved when the user confirms or if no confirm needed.
         */
        self.confirmDownloadSize = function(sizeCalc, message, unknownsizemessage, wifiThreshold, limitedThreshold) {
            wifiThreshold = typeof wifiThreshold == 'undefined' ? mmCoreWifiDownloadThreshold : wifiThreshold;
            limitedThreshold = typeof limitedThreshold == 'undefined' ? mmCoreDownloadThreshold : limitedThreshold;

            // Backward compatibility conversion.
            if (typeof sizeCalc == 'number') {
                sizeCalc = {size: sizeCalc, total: false};
            }

            if (sizeCalc.size < 0 || (sizeCalc.size == 0 && !sizeCalc.total)) {
                // Seems size was unable to be calculated. Show a warning.
                unknownsizemessage = unknownsizemessage || 'mm.course.confirmdownloadunknownsize';
                return self.showConfirm($translate(unknownsizemessage));
            } else if (!sizeCalc.total) {
                // Filesize is only partial.
                var readableSize = $mmText.bytesToSize(sizeCalc.size, 2);
                return self.showConfirm($translate('mm.course.confirmpartialdownloadsize', {size: readableSize}));
            } else if (sizeCalc.size >= wifiThreshold || ($mmApp.isNetworkAccessLimited() && sizeCalc.size >= limitedThreshold)) {
                message = message || 'mm.course.confirmdownload';
                var readableSize = $mmText.bytesToSize(sizeCalc.size, 2);
                return self.showConfirm($translate(message, {size: readableSize}));
            }
            return $q.when();
        };

        /**
         * Sum the filesizes from a list of files checking if the size will be partial or totally calculated.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#sumFileSizes
         * @param  {Array} files  List of files to sum its filesize.
         * @return {Object}       With the file size and a boolean to indicate if it is the total size or only partial.
         */
        self.sumFileSizes = function(files) {
            var results = {
                size: 0,
                total: true
            };

            angular.forEach(files, function(file) {
                if (typeof file.filesize == 'undefined') {
                    // We don't have the file size, cannot calculate its total size.
                    results.total = false;
                } else {
                    results.size += file.filesize;
                }
            });

            return results;
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
         * Given a float, prints it nicely.
         * Localized floats must not be used in calculations!
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#formatFloat
         * @see adapted from format_float function on moodlelib.php
         * @param  {Mixed}  float           The float to print
         * @return {String}  locale float
         */
        self.formatFloat = function(float) {
            if (typeof float == "undefined") {
                return '';
            }

            var localeSeparator = $translate.instant('mm.core.decsep');

            // Convert float to string.
            float += '';
            return float.replace('.', localeSeparator);
        }

        /**
         * Converts locale specific floating point/comma number back to standard PHP float value
         * Do NOT try to do any math operations before this conversion on any user submitted floats!
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#unformatFloat
         * @see adapted from unformat_float function on moodlelib.php
         * @param  {Mixed}  localeFloat Locale aware float representation
         * @return {Mixed}  float|string|bool - false if bad format. Empty string if empty value or the parsed float if not.
         */
        self.unformatFloat = function(localeFloat) {
            // Bad format on input type number.
            if (typeof localeFloat == "undefined") {
                return false;
            }

            // Empty (but not zero).
            if (localeFloat == null) {
                return "";
            }

            // Convert float to string.
            localeFloat += '';
            localeFloat = localeFloat.trim();

            if (localeFloat == "") {
                return "";
            }

            var localeSeparator = $translate.instant('mm.core.decsep');

            localeFloat = localeFloat.replace(' ', ''); // No spaces - those might be used as thousand separators.
            localeFloat = localeFloat.replace(localeSeparator, '.');

            localeFloat = parseFloat(localeFloat);
            // Bad format.
            if (isNaN(localeFloat)) {
                return false;
            }
            return localeFloat;
        }

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

        /**
         * Scroll to a certain element inside another element.
         * This is done this way because using anchorScroll or $location.hash sticks the scroll to go upwards.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#scrollToElement
         * @param  {Object} container           Element to search in.
         * @param  {String} [selector]          Selector to find the element to scroll to. If not defined, scroll to the container.
         * @param  {Object} [scrollDelegate]    Scroll delegate. If not defined, use $ionicScrollDelegate.
         * @param  {String} [scrollParentClass] Scroll Parent Class where to stop calculating the position. Default scroll-content.
         * @return {Boolean}                    True if the element is found, false otherwise.
         */
        self.scrollToElement = function(container, selector, scrollDelegate, scrollParentClass) {
            var position;

            if (!scrollDelegate) {
                scrollDelegate = $ionicScrollDelegate;
            }

            position = self.getElementXY(container, selector, scrollParentClass);
            if (!position) {
                return false;
            }

            scrollDelegate.scrollTo(position[0], position[1]);
            return true;
        };

        /**
         * Retrieve the position of a element relative to another element.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#getElementXY
         * @param  {Object} container           Element to search in.
         * @param  {String} [selector]          Selector to find the element to scroll to. If not defined, scroll to the container.
         * @param  {String} [scrollParentClass] Scroll Parent Class where to stop calculating the position. Default scroll-content.
         * @return {Array}                      positionLeft, positionTop of the element relative to.
         */
        self.getElementXY = function(container, selector, positionParentClass) {
            var element = selector ? container.querySelector(selector) : container,
                offsetElement,
                positionTop = 0,
                positionLeft = 0;

            if (!positionParentClass) {
                positionParentClass = 'scroll-content';
            }

            if (!element) {
                return false;
            }

            while (element) {
                positionLeft += (element.offsetLeft - element.scrollLeft + element.clientLeft);
                positionTop += (element.offsetTop - element.scrollTop + element.clientTop);

                offsetElement = element.offsetParent;
                element = element.parentElement;

                // Every parent class has to be checked but the position has to be got form offsetParent.
                while (offsetElement != element && element) {
                    // If positionParentClass element is reached, stop adding tops.
                    if (angular.element(element).hasClass(positionParentClass)) {
                        element = false;
                    } else {
                        element = element.parentElement;
                    }
                }

                // Finally, check again.
                if (angular.element(element).hasClass(positionParentClass)) {
                    element = false;
                }
            }

            return [positionLeft, positionTop];
        };

        /**
         * Search all the URLs in a CSS file content.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#extractUrlsFromCSS
         * @param  {String} code CSS code.
         * @return {String[]}    List of URLs.
         */
        self.extractUrlsFromCSS = function(code) {
            // First of all, search all the url(...) occurrences that don't include "data:".
            var urls = [],
                matches = code.match(/url\(\s*["']?(?!data:)([^)]+)\)/igm);

            // Extract the URL form each match.
            angular.forEach(matches, function(match) {
                var submatches = match.match(/url\(\s*['"]?([^'"]*)['"]?\s*\)/im);
                if (submatches && submatches[1]) {
                    urls.push(submatches[1]);
                }
            });

            return urls;
        };

        /**
         * Returns the contents of a certain selection in a DOM element.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#getContentsOfElement
         * @param  {Object} element  DOM element to search in.
         * @param  {String} selector Selector to search.
         * @return {String}          Selection contents. Undefined if not found.
         */
        self.getContentsOfElement = function(element, selector) {
            if (element) {
                var el = element[0] || element, // Convert from jqLite to plain JS if needed.
                    selected = el.querySelector(selector);
                if (selected) {
                    return selected.innerHTML;
                }
            }
        };

        /**
         * Search and remove a certain element from inside another element.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#removeElement
         * @param  {Object} element  DOM element to search in.
         * @param  {String} selector Selector to search.
         * @return {Void}
         */
        self.removeElement = function(element, selector) {
            if (element) {
                var el = element[0] || element, // Convert from jqLite to plain JS if needed.
                    selected = el.querySelector(selector);
                if (selected) {
                    angular.element(selected).remove();
                }
            }
        };

        /**
         * Search and remove a certain element from an HTML code.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#removeElementFromHtml
         * @param  {String} html       HTML code to change.
         * @param  {String} selector   Selector to search.
         * @param  {Boolean} removeAll True if it should remove all matches found, false if it should only remove the first one.
         * @return {String}            HTML without the element.
         */
        self.removeElementFromHtml = function(html, selector, removeAll) {
            // Create a fake div element so we can search using querySelector.
            var div = document.createElement('div'),
                selected;

            div.innerHTML = html;

            if (removeAll) {
                selected = div.querySelectorAll(selector);
                angular.forEach(selected, function(el) {
                    angular.element(el).remove();
                });
            } else {
                selected = div.querySelector(selector);
                if (selected) {
                    angular.element(selected).remove();
                }
            }

            return div.innerHTML;
        };

        /**
         * Search for certain classes in an element contents and replace them with the specified new values.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#replaceClassesInElement
         * @param  {Object} element DOM element.
         * @param  {Object} map     Mapping of the classes to replace. Keys must be the value to replace, values must be
         *                          the new class name. Example: {'correct': 'mm-question-answer-correct'}.
         * @return {Void}
         */
        self.replaceClassesInElement = function(element, map) {
            element = element[0] || element; // Convert from jqLite to plain JS if needed.

            angular.forEach(map, function(newValue, toReplace) {
                var matches = element.querySelectorAll('.' + toReplace);
                angular.forEach(matches, function(element) {
                    element.className = element.className.replace(toReplace, newValue);
                });
            });
        };

        /**
         * Equivalent to element.closest(). If the browser doesn't support element.closest, it will
         * traverse the parents to achieve the same functionality.
         * Returns the closest ancestor of the current element (or the current element itself) which matches the selector.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#closest
         * @param  {Object} element  DOM Element.
         * @param  {String} selector Selector to search.
         * @return {Object}          Closest ancestor.
         */
        self.closest = function(element, selector) {
            // Try to use closest if the browser supports it.
            if (typeof element.closest == 'function') {
                return element.closest(selector);
            }

            if (!matchesFn) {
                // Find the matches function supported by the browser.
                ['matches','webkitMatchesSelector','mozMatchesSelector','msMatchesSelector','oMatchesSelector'].some(function(fn) {
                    if (typeof document.body[fn] == 'function') {
                        matchesFn = fn;
                        return true;
                    }
                    return false;
                });

                if (!matchesFn) {
                    return;
                }
            }

            // Traverse parents.
            while (element) {
                if (element[matchesFn](selector)) {
                    return element;
                }
                element = element.parentElement;
            }
        };

        /**
         * Extract the downloadable URLs from an HTML.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#extractDownloadableFilesFromHtml
         * @param  {String} html HTML code.
         * @return {String[]}    List of file urls.
         */
        self.extractDownloadableFilesFromHtml = function(html) {
            var div = document.createElement('div'),
                elements,
                urls = [];

            div.innerHTML = html;
            elements = div.querySelectorAll('a, img, audio, video, source');

            angular.forEach(elements, function(element) {
                var url = element.tagName === 'A' ? element.href : element.src;
                if (url && self.isDownloadableUrl(url) && urls.indexOf(url) == -1) {
                    urls.push(url);
                }
            });

            return urls;
        };

        /**
         * Extract the downloadable URLs from an HTML and returns them in fake file objects.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#extractDownloadableFilesFromHtmlAsFakeFileObjects
         * @param  {String} html HTML code.
         * @return {Object[]}    List of fake file objects with file URLs.
         */
        self.extractDownloadableFilesFromHtmlAsFakeFileObjects = function(html) {
            var urls = self.extractDownloadableFilesFromHtml(html);
            // Convert them to fake file objects.
            return urls.map(function(url) {
                return {
                    fileurl: url
                };
            });
        };

        /**
         * Converts an object into an array of objects, where each entry is an object containing
         * the key and value of the original object.
         * For example, it can convert {size: 2} into [{name: 'size', value: 2}].
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#objectToArrayOfObjects
         * @param  {Object} obj       Object to convert.
         * @param  {String} keyName   Name of the properties where to store the keys.
         * @param  {String} valueName Name of the properties where to store the values.
         * @param  {Boolean} sort     True to sort keys alphabetically, false otherwise.
         * @return {Object[]}         Array of objects with the name & value of each property.
         */
        self.objectToArrayOfObjects = function(obj, keyName, valueName, sort) {
            var result = [],
                keys = Object.keys(obj);

            if (sort) {
                keys = keys.sort();
            }

            angular.forEach(keys, function(key) {
                var entry = {};
                entry[keyName] = key;
                entry[valueName] = obj[key];
                result.push(entry);
            });
            return result;
        };

        /**
         * Tests to see whether two arrays or objects have the same value at a particular key.
         * Missing values are replaced by '', and the values are compared with ===.
         * Booleans and numbers are cast to string before comparing.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#sameAtKeyMissingIsBlank
         * @param  {Object} obj1 The first object or array.
         * @param  {Object} obj2 The second object or array.
         * @param  {String} key  Key to check.
         * @return {Boolean}     Whether the two objects/arrays have the same value (or lack of one) for a given key.
         */
        self.sameAtKeyMissingIsBlank = function(obj1, obj2, key) {
            var value1 = typeof obj1[key] != 'undefined' ? obj1[key] : '',
                value2 = typeof obj2[key] != 'undefined' ? obj2[key] : '';

            if (typeof value1 == 'number' || typeof value1 == 'boolean') {
                value1 = '' + value1;
            }
            if (typeof value2 == 'number' || typeof value2 == 'boolean') {
                value2 = '' + value2;
            }
            return value1 === value2;
        };

        /**
         * Merge two arrays, removing duplicate values.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#mergeArraysWithoutDuplicates
         * @param  {Array} array1 The first array.
         * @param  {Array} array2 The second array.
         * @return {Array}        Merged array.
         */
        self.mergeArraysWithoutDuplicates = function(array1, array2) {
            return self.uniqueArray(array1.concat(array2));
        };

        /**
         * Return an array without duplicate values.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#uniqueArray
         * @param  {Array} array The array to treat.
         * @return {Array}       Array without duplicate values.
         */
        self.uniqueArray = function(array) {
            var unique = [],
                len = array.length;
            for (var i = 0; i < len; i++) {
                var value = array[i];
                if (unique.indexOf(value) == -1) {
                    unique.push(value);
                }
            }
            return unique;
        };

        /**
         * Given an error returned by a WS call (site.read, site.write),
         * check if the error is generated by the app or it has been returned by the WebSwervice.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#isWebServiceError
         * @param  {String}  error Error returned.
         * @return {Boolean}       True if the error was returned by the WebService, false otherwise.
         */
        self.isWebServiceError = function(error) {
            var localErrors = [
                $translate.instant('mm.core.wsfunctionnotavailable'),
                $translate.instant('mm.core.lostconnection'),
                $translate.instant('mm.core.userdeleted'),
                $translate.instant('mm.core.unexpectederror'),
                $translate.instant('mm.core.networkerrormsg'),
                $translate.instant('mm.core.serverconnection'),
                $translate.instant('mm.core.errorinvalidresponse'),
                $translate.instant('mm.core.sitemaintenance'),
                $translate.instant('mm.core.upgraderunning'),
                $translate.instant('mm.core.nopasswordchangeforced')
            ];
            return error && localErrors.indexOf(error) == -1;
        };

        /**
         * Focus an element and open keyboard.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#focusElement
         * @param  {Object} el DOM element to focus.
         * @return {Void}
         */
        self.focusElement = function(el) {
            if (el && el.focus) {
                el.focus();
                if (ionic.Platform.isAndroid() && self.supportsInputKeyboard(el)) {
                    // On some Android versions the keyboard doesn't open automatically.
                    $mmApp.openKeyboard();
                }
            }
        };

        /**
         * Check if an element supports input via keyboard.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#supportsInputKeyboard
         * @param  {Object} el DOM element to check.
         * @return {Boolean}   True if supports input using keyboard.
         */
        self.supportsInputKeyboard = function(el) {
            return el && !el.disabled && (el.tagName.toLowerCase() == 'textarea' ||
                (el.tagName.toLowerCase() == 'input' && inputSupportKeyboard.indexOf(el.type) != -1));
        };

        /**
         * Check if rich text editor is supported in the platform.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#isRichTextEditorSupported
         * @return {Boolean} True if supported, false otherwise.
         */
        self.isRichTextEditorSupported = function() {
            // Enabled for all platforms different from iOS and Android.
            if (!ionic.Platform.isIOS() && !ionic.Platform.isAndroid()) {
                return true;
            }

            // Check Android version >= 4.4
            if (ionic.Platform.isAndroid() && ionic.Platform.version() >= 4.4) {
                return true;
            }

            return false;
        };

        /**
         * Check if rich text editor is enabled.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#isRichTextEditorEnabled
         * @return {Promise} Promise resolved with boolean: true if enabled, false otherwise.
         */
        self.isRichTextEditorEnabled = function() {
            if (self.isRichTextEditorSupported()) {
                return $mmConfig.get(mmCoreSettingsRichTextEditor, true);
            }

            return $q.when(false);
        };

        /**
         * Given a list of files, check if there are repeated names.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#hasRepeatedFilenames
         * @param  {Object[]} files List of files.
         * @return {Mixed}          String with error message if repeated, false if no repeated.
         */
        self.hasRepeatedFilenames = function(files) {
            if (!files || !files.length) {
                return false;
            }

            var names = [];

            // Check if there are 2 files with the same name.
            for (var i = 0; i < files.length; i++) {
                var name = files[i].filename || files[i].name;
                if (names.indexOf(name) > -1) {
                    return $translate.instant('mm.core.filenameexist', {$a: name});
                } else {
                    names.push(name);
                }
            }

            return false;
        };

        return self;
    };
});
