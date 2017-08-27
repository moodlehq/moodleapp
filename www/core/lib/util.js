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
                $mmConfig, mmCoreSettingsRichTextEditor, $rootScope, $ionicPlatform, $ionicHistory, mmCoreSplitViewBlock, $state,
                $window, $cordovaClipboard, mmCoreDontShowError) {

        $log = $log.getInstance('$mmUtil');

        var self = {}, // Use 'self' to be coherent with the rest of services.
            matchesFn,
            inputSupportKeyboard = ['date', 'datetime', 'datetime-local', 'email', 'month', 'number', 'password',
                'search', 'tel', 'text', 'time', 'url', 'week'],
            originalBackFunction = $rootScope.$ionicGoBack,
            backFunctionsStack = [originalBackFunction],
            toastPromise;

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
         * Returns if a URL has any protocol, if not is a relative URL.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#isAbsoluteURL
         * @param {String} url The url to test against the pattern
         * @return {Boolean}   TRUE if the url is absolute. FALSE if it is relative.
         */
        self.isAbsoluteURL = function(url) {
            return /^[^:]{2,10}:\/\//i.test(url) || /^(tel:|mailto:|geo:)/.test(url);
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
            // Always send offline=1 (for external repositories). It shouldn't cause problems for local files or old Moodles.
            url += 'token=' + token + '&offline=1';

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

            if ($mmApp.isDesktop()) {
                // It's a desktop app, send an event so the file is opened. It has to be done with an event
                // because opening the file from here (renderer process) doesn't focus the opened app.
                // Use sendSync so we can receive the result.
                if (require('electron').ipcRenderer.sendSync('openItem', path)) {
                    deferred.resolve();
                } else {
                    $mmLang.translateAndRejectDeferred(deferred, 'mm.core.erroropenfilenoapp');
                }
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
                            path = encodeURIComponent($mmText.decodeURIComponent(path));
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
            if ($mmApp.isDesktop()) {
                // It's a desktop app, use Electron shell library to open the browser.
                var shell = require('electron').shell;
                if (!shell.openExternal(url)) {
                    // Open browser failed, open a new window in the app.
                    window.open(url, '_system');
                }
            } else {
                window.open(url, '_system');
            }
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
         * @param  {Boolean} [closeAll] Desktop only. True to close all secondary windows, false to close only the "current" one.
         * @return {Void}
         */
        self.closeInAppBrowser = function(closeAll) {
            // Use try/catch because it will fail if there is no opened InAppBrowser.
            try {
                $cordovaInAppBrowser.close();
                if (closeAll && $mmApp.isDesktop()) {
                    require('electron').ipcRenderer.send('closeSecondaryWindows');
                }
            } catch(ex) {}
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
                var iParams;

                self.getMimeTypeFromUrl(url).catch(function() {
                    // Error getting mimetype, return undefined.
                }).then(function(mimetype) {
                    if (!mimetype) {
                        // Couldn't retrieve mimetype. Return error.
                        $mmLang.translateAndRejectDeferred(deferred, 'mm.core.erroropenfilenoextension');
                        return;
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

                            $mmLang.translateAndRejectDeferred(deferred, 'mm.core.erroropenfilenoapp');
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
         * Get the mimetype of a file given its URL. It'll try to guess it using the URL, if that fails then it'll
         * perform a HEAD request to get it. It's done in this order because pluginfile.php can return wrong mimetypes.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#getMimeType
         * @param  {String} url The URL of the file.
         * @return {Promise}    Promise resolved with the mimetype.
         * @deprecated since 3.3. Use $mmUtil#getMimeTypeFromUrl.
         */
        self.getMimeType = function(url) {
            $log.warn('$mmUtil#getMimeType is deprecated. Use $mmUtil#getMimeTypeFromUrl instead');
            return self.getMimeTypeFromUrl(url);
        };

        /**
         * Get the mimetype of a file given its URL. It'll try to guess it using the URL, if that fails then it'll
         * perform a HEAD request to get it. It's done in this order because pluginfile.php can return wrong mimetypes.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#getMimeTypeFromUrl
         * @param  {String} url The URL of the file.
         * @return {Promise}    Promise resolved with the mimetype.
         */
        self.getMimeTypeFromUrl = function(url) {
            // First check if it can be guessed from the URL.
            var extension = $mmFS.guessExtensionFromUrl(url),
                mimetype = $mmFS.getMimeType(extension);

            if (mimetype) {
                return $q.when(mimetype);
            }

            // Can't be guessed, get the remote mimetype.
            return $mmWS.getRemoteFileMimeType(url).then(function(mimetype) {
                return mimetype || '';
            });
        };

        /**
         * Displays a loading modal window.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#showModalLoading
         * @param {String}  [text]                  The text of the modal window. Default: mm.core.loading.
         * @param {Boolean} [needsTranslate=false]  True if the 'text' is a $translate key, false otherwise.
         * @return {Object}                         Object with a 'dismiss' function to close the modal.
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

            if (!modalClosed) {
                if (!text) {
                    text = $translate.instant('mm.core.loading');
                } else if (needsTranslate) {
                    text = $translate.instant(text);
                }

                showModalPromise = $ionicLoading.show({
                    template:   '<ion-spinner></ion-spinner>' +
                                '<p>' + addFormatTextIfNeeded(text) + '</p>'
                }).then(function() {
                    showModalPromise = null;
                    if (!modalClosed) {
                        modalShown = true;
                    }
                });
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
         * Displays an autodimissable toast modal window.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#showToast
         * @param {String}  text                    The text of the toast.
         * @param {Boolean} [needsTranslate=false]  True if the 'text' is a $translate key, false otherwise.
         * @param {Number}  [duration=2000]         Duration in ms of the dimissable toast.
         * @return {Promise}                        Returned by $ionicLoading.
         */
        self.showToast = function(text, needsTranslate, duration) {
            duration = duration || 2000;

            if (needsTranslate) {
                text = $translate.instant(text);
            }

            return $ionicLoading.show({
                template: text,
                duration: duration,
                noBackdrop: true,
                hideOnStateChange: true
            }).then(function() {
                var container = angular.element(document.querySelector(".loading-container.visible")).addClass('mm-toast');

                // Remove class on close.
                $timeout.cancel(toastPromise);
                toastPromise = $timeout(function() {
                    container.removeClass('mm-toast');
                }, duration);
            });
        };

        /**
         * Copies a text to clipboard and shows a toast message.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#showToast
         * @param  {String} text Text to be copied
         * @return {Promise}     Resolved when text is copied.
         */
        self.copyToClipboard = function(text) {
            return $cordovaClipboard.copy(text).then(function() {
                // Show toast using ionicLoading.
                return self.showToast('mm.core.copiedtoclipboard', true);
            }).catch(function () {
                // Ignore errors.
            });
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

            options.template = addFormatTextIfNeeded(template); // Add format-text to handle links.

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
         * @param {Mixed}   errorMessage     Message to show.
         * @param {Boolean} [needsTranslate] True if the errorMessage is a $translate key, false otherwise.
         * @param {Number}  [autocloseTime]  Number of milliseconds to wait to close the modal.
         *                                   If not defined, modal won't be automatically closed.
         */
        self.showErrorModal = function(errorMessage, needsTranslate, autocloseTime) {
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
                var matches = errorMessage.match(/token"?[=|:]"?(\w*)/, '');
                if (matches && matches[1]) {
                    errorMessage = errorMessage.replace(new RegExp(matches[1], 'g'), 'secret');
                }
            }

            var message = $mmText.decodeHTML(needsTranslate ? $translate.instant(errorMessage) : errorMessage),
                popup = $ionicPopup.alert({
                    title: getErrorTitle(message),
                    template: addFormatTextIfNeeded(message) // Add format-text to handle links.
                });

            if (typeof autocloseTime != 'undefined' && !isNaN(parseInt(autocloseTime))) {
                $timeout(function() {
                    popup.close();
                }, parseInt(autocloseTime));
            }
        };

        function getErrorTitle(message) {
            if (message == $translate.instant('mm.core.networkerrormsg') ||
                    message == $translate.instant('mm.fileuploader.errormustbeonlinetoupload')) {
                return '<span class="mm-icon-with-badge"><i class="icon ion-wifi"></i>\
                    <i class="icon ion-alert-circled mm-icon-badge"></i></span>';
            }
            return $mmText.decodeHTML($translate.instant('mm.core.error'));
        }

        /**
         * Show a modal with an error message specifying a default message if error is empty.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#showErrorModalDefault
         * @param {Mixed}   errorMessage      Message to show.
         * @param {Mixed}   [defaultError]    Message to show. If errorMessage is empty.
         * @param {Boolean} [needsTranslate]  True if the errorMessage is a $translate key, false otherwise.
         * @param {Number}  [autocloseTime]   Number of milliseconds to wait to close the modal.
         *                                    If not defined, modal won't be automatically closed.
         */
        self.showErrorModalDefault = function(errorMessage, defaultError, needsTranslate, autocloseTime) {
            if (errorMessage != mmCoreDontShowError) {
                errorMessage = typeof errorMessage == 'string' ? errorMessage : defaultError;
                return self.showErrorModal(errorMessage, needsTranslate, autocloseTime);
            }
        };

        /**
         * Show a modal with an error message.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#showModal
         * @param {String} title           Language key.
         * @param {String} message         Language key.
         * @param {Number} [autocloseTime] Number of milliseconds to wait to close the modal.
         * @return {Promise}               A promise resolved when the popup is closed. Has one additional function "close",
         *                                 which can be called to programmatically close the popup with the given value.
         */
        self.showModal = function(title, message, autocloseTime) {
            title = $translate.instant(title);
            message = $translate.instant(message);
            autocloseTime = parseInt(autocloseTime);

            var popup = $ionicPopup.alert({
                title: title,
                template: addFormatTextIfNeeded(message) // Add format-text to handle links.
            });

            if (autocloseTime > 0) {
                $timeout(function() {
                    popup.close();
                }, autocloseTime);
            }

            return popup;
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

            options.template = addFormatTextIfNeeded(template); // Add format-text to handle links.
            options.title = title;
            if (!title) {
                options.cssClass = 'mm-nohead';
            }
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
                template: addFormatTextIfNeeded(body), // Add format-text to handle links.
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
         * Wraps a message with mm-format-text if the message contains < and >.
         *
         * @param  {String} message Message to wrap.
         * @return {String}         Result message.
         */
        function addFormatTextIfNeeded(message) {
            if ($mmText.hasHTMLTags(message)) {
                return '<mm-format-text watch="true">' + message + '</mm-format-text>';
            }
            return message;
        }

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
         * Get list of countries with their code and translated name.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#getCountryList
         * @return {Object} List of countries.
         */
        self.getCountryList = function() {
            var table = $translate.getTranslationTable(),
                countries = {};

            angular.forEach(table, function(value, name) {
                if (name.indexOf('mm.core.country-') === 0) {
                    name = name.replace('mm.core.country-', '');
                    countries[name] = value;
                }
            });

            return countries;
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
            return Math.round(Date.now() / 1000);
        };

        /**
         * Return the current timestamp in a "readable" format: YYYYMMDDHHmmSS.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#readableTimestamp
         * @return {Number} The readable timestamp.
         */
        self.readableTimestamp = function() {
            return moment(Date.now()).format('YYYYMMDDHHmmSS');
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
            return typeof value != 'undefined' && (value === false || value === "false" || parseInt(value) === 0);
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
            return typeof value != 'undefined' && (value === true || value === "true" || parseInt(value) === 1);
        };

        /**
         * Returns hours, minutes and seconds in a human readable format
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#formatTime
         * @param  {Integer} seconds A number of seconds
         * @return {Promise}         Promise resolved with human readable seconds formatted
         * @deprecated since 3.3. Please use $mmUtil#formatTimeInstant instead.
         */
        self.formatTime = function(seconds) {
            return $q.when(self.formatTimeInstant(seconds));
        };

        /**
         * Returns hours, minutes and seconds in a human readable format.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#formatTimeInstant
         * @param  {Integer} seconds A number of seconds
         * @return {String}          Human readable seconds formatted
         * @since 3.3
         */
        self.formatTimeInstant = function(seconds) {
            var totalSecs = Math.abs(seconds);
            var years     = Math.floor(totalSecs / mmCoreSecondsYear);
            var remainder = totalSecs - (years * mmCoreSecondsYear);
            var days      = Math.floor(remainder / mmCoreSecondsDay);
            remainder = totalSecs - (days * mmCoreSecondsDay);
            var hours     = Math.floor(remainder / mmCoreSecondsHour);
            remainder = remainder - (hours * mmCoreSecondsHour);
            var mins      = Math.floor(remainder / mmCoreSecondsMinute);
            var secs      = remainder - (mins * mmCoreSecondsMinute);

            var ss = $translate.instant('mm.core.' + (secs == 1 ? 'sec' : 'secs'));
            var sm = $translate.instant('mm.core.' + (mins == 1 ? 'min' : 'mins'));
            var sh = $translate.instant('mm.core.' + (hours == 1 ? 'hour' : 'hours'));
            var sd = $translate.instant('mm.core.' + (days == 1 ? 'day' : 'days'));
            var sy = $translate.instant('mm.core.' + (years == 1 ? 'year' : 'years'));

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

            return $translate.instant('mm.core.now');
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
         * Returns a tree formatted from the a plain list.
         * List has to be sorted by depth to allow this function to work correctly. Errors can be thrown if a child node is
         * processed before a parent node.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#formatTree
         * @param  {Array}  list                List to format.
         * @param  {String} [parentFieldName]   Name of the parent field to match with children. Default: parent.
         * @param  {String} [idFieldName]       Name of the children field to match with parent. Default: id.
         * @param  {Number} [rootParentId]      The id of the root. Default: 0.
         * @param  {Number} [maxDepth]          Max Depth to convert to tree. Children found will be in the last level of depth.
         *                                          Default: 5.
         * @return {Array}                      Array with the formatted tree, children will be on each node under children field.
         */
        self.formatTree = function(list, parentFieldName, idFieldName, rootParentId, maxDepth) {
            var map = {},
                mapDepth = {},
                parent, id,
                tree = [];

            parentFieldName = parentFieldName || 'parent';
            idFieldName = idFieldName || 'id';
            rootParentId = rootParentId || 0;
            maxDepth = maxDepth || 5;

            angular.forEach(list, function(node, index) {
                id = node[idFieldName];
                parent = node[parentFieldName];
                node.children = [];

                // Use map to look-up the parents.
                map[id] = index;
                if (parent != rootParentId) {
                    var parentNode = list[map[parent]];
                    if (parentNode) {
                        if (mapDepth[parent] == maxDepth) {
                            // Reached max level of depth. Proceed with flat order. Find parent object of the current node.
                            var parentOfParent = parentNode[parentFieldName];
                            if (parentOfParent) {
                                // This element will be the child of the node that is two levels up the hierarchy
                                // (i.e. the child of node.parent.parent).
                                list[map[parentOfParent]].children.push(node);
                                // Assign depth level to the same depth as the parent (i.e. max depth level).
                                mapDepth[id] = mapDepth[parent];
                                // Change the parent to be the one that is two levels up the hierarchy.
                                node.parent = parentOfParent;
                            }
                        } else {
                            parentNode.children.push(node);
                            // Increase the depth level.
                            mapDepth[id] = mapDepth[parent] + 1;
                        }
                    }
                } else {
                    tree.push(node);

                    // Root elements are the first elements in the tree structure, therefore have the depth level 1.
                    mapDepth[id] = 1;
                }
            });

            return tree;
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
         * Execute promises one depending on the previous.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#executeOrderedPromises
         * @param  {Object[]} orderedPromisesData       Data to be executed including the following values:
         *                                               - func: Function to be executed.
         *                                               - params: Array of data to be sent to the function.
         *                                               - blocking: Boolean. If promise should block the following.
         * @return {Promise}                        Promise resolved when all generated promises are resolved.
         */
        self.executeOrderedPromises = function(orderedPromisesData) {
            var promises = [],
                dependency = $q.when();

            // Execute all the processes in order.
            angular.forEach(orderedPromisesData, function(data) {
                var promise;

                // Add the process to the dependency stack.
                promise = dependency.finally(function() {
                    var prom, fn;

                    try {
                        fn = self.resolveObject(data.func);
                        prom = fn.apply(prom, data.params || []);
                    } catch (e) {
                        $log.error(e.message);
                        return;
                    }
                    return prom;
                });
                promises.push(promise);

                // If the new process is blocking, we set it as the dependency.
                if (data.blocking) {
                    dependency = promise;
                }
            });

            // Return when all promises are done.
            return self.allPromises(promises);
        };

        /**
         * Check if a promise works and returns true if resolves or false if rejects.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#promiseWorks
         * @param  {Promise} promise    Promise to check
         * @return {Promise}            Promise resolved with true if the promises resolves and false if rejects.
         */
        self.promiseWorks = function(promise) {
            return promise.then(function() {
                return true;
            }).catch(function() {
                return false;
            });
        };

        /**
         * Check if a promise works and returns true if rejects or false if resolves.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#promiseFails
         * @param  {Promise} promise    Promise to check
         * @return {Promise}            Promise resolved with true if the promises rejects and false if resolves.
         */
        self.promiseFails = function(promise) {
            return promise.then(function() {
                return false;
            }).catch(function() {
                return true;
            });
        };

        /**
         * Compare two objects. This function won't compare functions and proto properties, it's a basic compare.
         * Also, this will only check if itemA's properties are in itemB with same value. This function will still
         * return true if itemB has more properties than itemA.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#basicLeftCompare
         * @param {Mixed}  itemA                   First object.
         * @param {Mixed}  itemB                   Second object.
         * @param {Number} [maxLevels=0]           Number of levels to reach if 2 objects are compared.
         * @param {Number} [level=0]               Current deep level (when comparing objects).
         * @param {Boolean} [undefinedIsNull=true] True if undefined is equal to null. Defaults to true.
         * @return {Boolean}                       True if equal, false otherwise.
         */
        self.basicLeftCompare = function(itemA, itemB, maxLevels, level, undefinedIsNull) {
            level = level || 0;
            maxLevels = maxLevels || 0;
            undefinedIsNull = typeof undefinedIsNull == 'undefined' ? true : undefinedIsNull;

            if (angular.isFunction(itemA) || angular.isFunction(itemB)) {
                return true; // Don't compare functions.
            } else if (angular.isObject(itemA) && angular.isObject(itemB)) {
                if (level >= maxLevels) {
                    return true; // Max deep reached.
                }

                var equal = true;
                angular.forEach(itemA, function(value, name) {
                    if (name == '$$hashKey') {
                        // Ignore $$hashKey property since it's a "calculated" property.
                        return;
                    }

                    if (!self.basicLeftCompare(value, itemB[name], maxLevels, level + 1)) {
                        equal = false;
                    }
                });
                return equal;
            } else {
                if (undefinedIsNull && (
                        (typeof itemA == 'undefined' && itemB === null) || (itemA === null && typeof itemB == 'undefined'))) {
                    return true;
                }

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
        };

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
         * Remove the parameters from a URL, returning the URL without them.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#removeUrlParams
         * @param  {String} url URL to treat.
         * @return {String}     URL without params.
         */
        self.removeUrlParams = function(url) {
            var matches = url.match(/^[^\?]+/);
            return matches && matches[0];
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

            // Treat elements with src (img, audio, video, ...).
            media = div[0].querySelectorAll('img, video, audio, source, track');
            angular.forEach(media, function(el) {
                var src = paths[$mmText.decodeURIComponent(el.getAttribute('src'))];
                if (typeof src !== 'undefined') {
                    el.setAttribute('src', src);
                }

                // Treat video posters.
                if (el.tagName == 'VIDEO' && el.getAttribute('poster')) {
                    src = paths[$mmText.decodeURIComponent(el.getAttribute('poster'))];
                    if (typeof src !== 'undefined') {
                        el.setAttribute('poster', src);
                    }
                }
            });

            // We do the same for links.
            angular.forEach(div.find('a'), function(anchor) {
                var href = $mmText.decodeURIComponent(anchor.getAttribute('href')),
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
         * Search for an input with error (mm-input-error directive) and scrolls to it if found.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#scrollToInputError
         * @param  {Object} container           Element to search in.
         * @param  {Object} [scrollDelegate]    Scroll delegate. If not defined, use $ionicScrollDelegate.
         * @param  {String} [scrollParentClass] Scroll Parent Class where to stop calculating the position. Default scroll-content.
         * @return {Boolean}                    True if the element is found, false otherwise.
         */
        self.scrollToInputError = function(container, scrollDelegate, scrollParentClass) {
            // Wait an instant to make sure errors are shown and scroll to the element.
            return $timeout(function() {
                if (!scrollDelegate) {
                    scrollDelegate = $ionicScrollDelegate;
                }

                scrollDelegate.resize();
                return self.scrollToElement(container, '.mm-input-has-errors', scrollDelegate, scrollParentClass);
            }, 100);
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
            elements = div.querySelectorAll('a, img, audio, video, source, track');

            angular.forEach(elements, function(element) {
                var url = element.tagName === 'A' ? element.href : element.src;
                if (url && self.isDownloadableUrl(url) && urls.indexOf(url) == -1) {
                    urls.push(url);
                }

                // Treat video poster.
                if (element.tagName == 'VIDEO' && element.getAttribute('poster')) {
                    url = element.getAttribute('poster');
                    if (url && self.isDownloadableUrl(url) && urls.indexOf(url) == -1) {
                        urls.push(url);
                    }
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
            var entries = getEntries('', obj);
            if (sort) {
                return entries.sort(function(a, b) {
                    return a.name >= b.name ? 1 : -1;
                });
            }
            return entries;

            // Get the entries from an object or primitive value.
            function getEntries(elKey, value) {
                if (typeof value == 'object') {
                    // It's an object, return at least an entry for each property.
                    var keys = Object.keys(value),
                        entries = [];

                    angular.forEach(keys, function(key) {
                        var newElKey = elKey ? elKey + '[' + key + ']' : key;
                        entries = entries.concat(getEntries(newElKey, value[key]));
                    });

                    return entries;
                } else {
                    // Not an object, return a single entry.
                    var entry = {};
                    entry[keyName] = elKey;
                    entry[valueName] = value;
                    return entry;
                }
            }
        };

        /**
         * Converts an object into an arrayloosing the keys.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#objectToArray
         * @param  {Object} obj       Object to convert.
         * @return {Array}            Array with the values of the object but loosing the keys.
         */
        self.objectToArray = function(obj) {
            return Object.keys(obj).map(function(key) {
                return obj[key];
            });
        };

        /**
         * Converts an array of objects into an object with key and value.
         * The contrary of objectToArrayOfObjects
         * For example, it can convert [{name: 'size', value: 2}] into {size: 2}.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#objectToKeyValueMap
         * @param  {Object} obj         Object to convert.
         * @param  {String} keyName     Name of the properties where the keys are stored.
         * @param  {String} valueName   Name of the properties where the keys are stored.
         * @param  {String} [keyPrefix] Key prefix if needed to delete it.
         * @return {Object[]}         Array of objects mapped.
         */
        self.objectToKeyValueMap = function(obj, keyName, valueName, keyPrefix) {
            var prefixSubstr = keyPrefix ? keyPrefix.length : 0,
                mapped = {};
            angular.forEach(obj, function(item) {
                var key = prefixSubstr > 0 ? item[keyName].substr(prefixSubstr) : item[keyName];
                mapped[key] = item[valueName];
            });
            return mapped;
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
         * @param  {String} [key] Key of the property that must be unique. If not specified, the whole entry.
         * @return {Array}        Merged array.
         */
        self.mergeArraysWithoutDuplicates = function(array1, array2, key) {
            return self.uniqueArray(array1.concat(array2), key);
        };

        /**
         * Return an array without duplicate values.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#uniqueArray
         * @param  {Array} array  The array to treat.
         * @param  {String} [key] Key of the property that must be unique. If not specified, the whole entry.
         * @return {Array}        Array without duplicate values.
         */
        self.uniqueArray = function(array, key) {
            var filtered = [],
                unique = [],
                len = array.length;

            for (var i = 0; i < len; i++) {
                var entry = array[i],
                    value = key ? entry[key] : entry;
                if (unique.indexOf(value) == -1) {
                    unique.push(value);
                    filtered.push(entry);
                }
            }

            return filtered;
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
                $translate.instant('mm.core.nopasswordchangeforced'),
                $translate.instant('mm.core.unicodenotsupported')
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

        /**
         * Blocks leaving a view. This function should be used in views that want to perform a certain action before
         * leaving (usually, ask the user if he wants to leave because some data isn't saved).
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#blockLeaveView
         * @param  {Object} scope         View's scope.
         * @param  {Function} canLeaveFn  Function called when the user wants to leave the view. Must return a promise
         *                                resolved if the view should be left, rejected if the user should stay in the view.
         * @param  {Object} [currentView] Current view. Defaults to $ionicHistory.currentView().
         * @return {Object}               Object with:
         *                                       -back: Original back function.
         *                                       -unblock: Function to unblock. It is called automatically when scope is destroyed.
         */
        self.blockLeaveView = function(scope, canLeaveFn, currentView) {
            currentView = currentView || $ionicHistory.currentView();

            var unregisterHardwareBack,
                leaving = false,
                hasSplitView = $ionicPlatform.isTablet() && $state.current.name.split('.').length == 3,
                skipSplitViewLeave = false;

            // Override Ionic's back button behavior.
            $rootScope.$ionicGoBack = goBack;

            // Override Android's back button. We set a priority of 101 to override the "Return to previous view" action.
            unregisterHardwareBack = $ionicPlatform.registerBackButtonAction(goBack, 101);

            // Add function to the stack.
            backFunctionsStack.push(goBack);

            if (hasSplitView) {
                // Block split view.
                blockSplitView(true);
            }

            scope.$on('$destroy', unblock);

            return {
                back: originalBackFunction,
                unblock: unblock
            };

            // Function called when the user wants to leave the view.
            function goBack() {
                // Check that we're leaving the current view, since the user can navigate to other views from here.
                if ($ionicHistory.currentView() !== currentView) {
                    // It's another view.
                    originalBackFunction();
                    return;
                }

                if (leaving) {
                    // Leave view pending, don't call again.
                    return;
                }
                leaving = true;

                canLeaveFn().then(function() {
                    // User confirmed to leave or there was no need to confirm, go back.
                    // Skip next leave view from split view if there's one since we already checked if user can leave.
                    skipSplitViewLeave = hasSplitView;
                    originalBackFunction();
                }).finally(function() {
                    leaving = false;
                });
            }

            // Leaving current view when it's in split view.
            function leaveViewInSplitView() {
                if (skipSplitViewLeave) {
                    skipSplitViewLeave = false;
                    return $q.when();
                }

                return canLeaveFn();
            }

            // Restore original back functions.
            function unblock() {
                unregisterHardwareBack();

                if (hasSplitView) {
                    // Unblock split view.
                    blockSplitView(false);
                }

                // Remove function from the stack.
                var position = backFunctionsStack.indexOf(goBack);
                if (position > -1) {
                    backFunctionsStack.splice(position, 1);
                }

                // Revert go back only if it hasn't been overridden by another view.
                if ($rootScope.$ionicGoBack === goBack) {
                    if (!backFunctionsStack.length) {
                        // Shouldn't happen. Reset stack.
                        backFunctionsStack = [originalBackFunction];
                        $rootScope.$ionicGoBack = originalBackFunction;
                    } else {
                        $rootScope.$ionicGoBack = backFunctionsStack[backFunctionsStack.length - 1];
                    }
                }
            }

            // Block or unblock split view.
            function blockSplitView(block) {
                $rootScope.$broadcast(mmCoreSplitViewBlock, {
                    block: block,
                    blockFunction: leaveViewInSplitView,
                    state: currentView.stateName,
                    stateParams: currentView.stateParams
                });
            }
        };

        /**
         * Check if an element is outside of screen (viewport).
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#isElementOutsideOfScreen
         * @param  {Object} element          DOM element to check.
         * @param  {String} [scrollSelector] Selector to find the scroll that contains the element.
         * @return {Boolean}                 Whether the element is outside of the viewport.
         */
        self.isElementOutsideOfScreen = function(element, scrollSelector) {
            scrollSelector = scrollSelector || '.scroll-content';

            var elementRect = element.getBoundingClientRect(),
                elementMidPoint,
                scrollEl = self.closest(element, scrollSelector),
                scrollElRect,
                scrollTopPos = 0;

            if (!elementRect) {
                return false;
            }

            elementMidPoint = Math.round((elementRect.bottom + elementRect.top) / 2);

            if (scrollEl) {
                scrollElRect = scrollEl.getBoundingClientRect();
                scrollTopPos = (scrollElRect && scrollElRect.top) || 0;
            }

            return elementMidPoint > $window.innerHeight || elementMidPoint < scrollTopPos;
        };

        /**
         * Copy properties from one object to another.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#copyProperties
         * @param  {Object} from Object to copy the properties from.
         * @param  {Object} to   Object where to store the properties.
         * @return {Void}
         */
        self.copyProperties = function(from, to) {
            angular.forEach(from, function(value, name) {
                to[name] = angular.copy(value);
            });
        };

        /**
         * Filter the list of site IDs based on a isEnabled function.
         *
         * @module mm.core
         * @ngdoc method
         * @name $mmUtil#filterEnabledSites
         * @param  {String[]} siteIds     Site IDs to filter.
         * @param  {Function} isEnabledFn Function to call for each site. Must return true or a promise resolved with true if
         *                                enabled. It receives a siteId param and all the params sent to this function after
         *                                'checkAll'.
         * @param  {Boolean} checkAll     True if it should check all the sites, false if it should check only 1 and treat them all
         *                                depending on this result.
         * @param  {Mixed}                All the params sent after checkAll will be passed to isEnabledFn.
         * @return {Promise}              Promise resolved with the list of enabled sites.
         */
        self.filterEnabledSites = function(siteIds, isEnabledFn, checkAll) {
            var promises = [],
                enabledSites = [],
                extraParams = Array.prototype.slice.call(arguments, 3); // Params received after 'checkAll'.

            angular.forEach(siteIds, function(siteId) {
                if (checkAll || !promises.length) {
                    promises.push($q.when(isEnabledFn.apply(isEnabledFn, [siteId].concat(extraParams))).then(function(enabled) {
                        if (enabled) {
                            enabledSites.push(siteId);
                        }
                    }));
                }
            });

            return self.allPromises(promises).catch(function() {
                // Ignore errors.
            }).then(function() {
                if (!checkAll) {
                    // Checking 1 was enough, so it will either return all the sites or none.
                    return enabledSites.length ? siteIds : [];
                } else {
                    return enabledSites;
                }
            });
        };

        /**
         * Returns element height of an element.
         *
         * @param  {Object}  element                DOM element to measure.
         * @param  {Boolean} [usePadding=false]     Use padding to calculate the measure.
         * @param  {Boolean} [useMargin=false]      Use margin to calculate the measure.
         * @param  {Boolean} [useBorder=false]      Use borders to calculate the measure.
         * @param  {Boolean} [innerMeasure=false]   If inner measure is needed: padding, margin or borders will be substracted.
         * @return {Number}                         Height in pixels.
         */
        self.getElementHeight = function(element, usePadding, useMargin, useBorder, innerMeasure) {
            var measure = element.offsetHeight || element.height || element.clientHeight || 0;

            // Measure not correctly taken.
            if (measure <= 0) {
                var angElement = angular.element(element);
                if (angElement.css('display') == '') {
                    angElement.css('display', 'inline-block');
                    measure = element.offsetHeight || element.height || element.clientHeight || 0;
                    angElement.css('display', '');
                }
            }

            if (usePadding || useMargin || useBorder) {
                var surround = 0,
                    cs = getComputedStyle(element);
                if (usePadding) {
                    surround += parseInt(cs.paddingTop, 10) + parseInt(cs.paddingBottom, 10);
                }
                if (useMargin) {
                    surround += parseInt(cs.marginTop, 10) + parseInt(cs.marginBottom, 10);
                }
                if (useBorder) {
                    surround += parseInt(cs.borderTop, 10) + parseInt(cs.borderBottom, 10);
                }
                if (innerMeasure) {
                    measure = measure > surround ? measure - surround : 0;
                } else {
                    measure += surround;
                }
            }
            return measure;
        };

        /**
         * Returns element width of an element.
         *
         * @param  {Object}  element                DOM element to measure.
         * @param  {Boolean} [usePadding=false]     Use padding to calculate the measure.
         * @param  {Boolean} [useMargin=false]      Use margin to calculate the measure.
         * @param  {Boolean} [useBorder=false]      Use borders to calculate the measure.
         * @param  {Boolean} [innerMeasure=false]   If inner measure is needed: padding, margin or borders will be substracted.
         * @return {Number}                         Witdh in pixels.
         */
        self.getElementWidth = function(element, usePadding, useMargin, useBorder, innerMeasure) {
            var measure = element.offsetWidth || element.width || element.clientWidth || 0;

            // Measure not correctly taken.
            if (measure <= 0) {
                var angElement = angular.element(element);
                if (angElement.css('display') == '') {
                    angElement.css('display', 'inline-block');
                    measure = element.offsetWidth || element.width || element.clientWidth || 0;
                    angElement.css('display', '');
                }
            }

            if (usePadding || useMargin || useBorder) {
                var surround = 0,
                    cs = getComputedStyle(element);
                if (usePadding) {
                    surround += parseInt(cs.paddingLeft, 10) + parseInt(cs.paddingRight, 10);
                }
                if (useMargin) {
                    surround += parseInt(cs.marginLeft, 10) + parseInt(cs.marginRight, 10);
                }
                if (useBorder) {
                    surround += parseInt(cs.borderLeft, 10) + parseInt(cs.borderRight, 10);
                }
                if (innerMeasure) {
                    measure = measure > surround ? measure - surround : 0;
                } else {
                    measure += surround;
                }
            }
            return measure;
        };

        return self;
    };
});
