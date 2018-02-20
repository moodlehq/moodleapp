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
 * This service handles the emulation of the Cordova InAppBrowser plugin in desktop apps.
 *
 * @ngdoc service
 * @name $mmEmulatorInAppBrowser
 * @module mm.core.emulator
 */
.factory('$mmEmulatorInAppBrowser', function($log, $q, $mmFS, $window, $mmApp, $timeout, $mmEmulatorHelper, $mmUtil) {

    $log = $log.getInstance('$mmEmulatorInAppBrowser');

    var self = {};

    /**
     * Recursive function to get the launch URL from the contents of a BrowserWindow.
     *
     * @param  {Object} webContents BrowserWindow's webcontents.
     * @param  {Number} [retry=0]   Retry number.
     * @return {[type]}             [description]
     */
    function getLaunchUrl(webContents, retry) {
        retry = retry || 0;

        // Execute Javascript to retrieve the launch link.
        var jsCode = 'var el = document.querySelector("#launchapp"); el && el.href;',
            deferred = $q.defer(),
            found = false;

        webContents.executeJavaScript(jsCode).then(function(launchUrl) {
            found = true;
            deferred.resolve(launchUrl);
        });

        $timeout(function() {
            if (found) {
                // URL found, stop.
            } else if (retry > 5) {
                // Waited enough, stop.
                deferred.reject();
            } else {
                getLaunchUrl(webContents, retry + 1).then(deferred.resolve, deferred.reject);
            }
        }, 300);

        return deferred.promise;
    }

    /**
     * Load the emulation of the Cordova plugin.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorInAppBrowser#load
     * @return {Promise} Promise resolved when done.
     */
    self.load = function() {
        if (!$mmApp.isDesktop()) {
            return $q.when();
        }

        var BrowserWindow = require('electron').remote.BrowserWindow,
            screen = require('electron').screen;

        // Redefine window open to be able to have full control over the new window.
        $window.open = function(url, frameName, features) {
            var width = 800,
                height = 600,
                display,
                newWindow,
                listeners = {},
                isLinux = $mmEmulatorHelper.isLinux(),
                isSSO = !!(url && url.match(/\/launch\.php\?service=.+&passport=/));

            if (screen) {
                display = screen.getPrimaryDisplay();
                if (display && display.workArea) {
                    width = display.workArea.width || width;
                    height = display.workArea.height || height;
                }
            }

            newWindow = new BrowserWindow({
                width: width,
                height: height
            });
            newWindow.loadURL(url);

            if (isLinux && isSSO) {
                // SSO in Linux. Simulate it's an iOS device so we can retrieve the launch URL.
                // This is needed because custom URL scheme is not supported in Linux.
                var userAgent = 'Mozilla/5.0 (iPad) AppleWebKit/603.3.8 (KHTML, like Gecko) Mobile/14G60';
                newWindow.webContents.setUserAgent(userAgent);
            }

            // Add the missing functions that InAppBrowser supports but BrowserWindow doesn't.
            newWindow.addEventListener = function(name, callback) {
                var that = this;

                // Store the received function instance to be able to remove the listener.
                listeners[callback] = [received];

                switch (name) {
                    case 'loadstart':
                        that.webContents.addListener('did-start-loading', received);

                        if (isLinux && isSSO) {
                            // Linux doesn't support custom URL Schemes. Check if launch page is loaded.
                            listeners[callback].push(finishLoad);
                            that.webContents.addListener('did-finish-load', finishLoad);

                            function finishLoad(event) {
                                // Check if user is back to launch page.
                                if ($mmUtil.removeUrlParams(url) == $mmUtil.removeUrlParams(that.getURL())) {
                                    // The launch page was loaded. Search for the launch link.
                                    getLaunchUrl(that.webContents).then(function(launchUrl) {
                                        if (launchUrl) {
                                            // Launch URL retrieved, send it and stop listening.
                                            received(event, launchUrl);
                                        }
                                    });
                                }
                            }
                        }
                        break;

                    case 'loadstop':
                        that.webContents.addListener('did-finish-load', received);
                        break;

                    case 'loaderror':
                        that.webContents.addListener('did-fail-load', received);
                        break;

                    case 'exit':
                        that.addListener('close', received);
                        break;
                }

                function received(event, url) {
                    try {
                        event.url = url || that.getURL();
                        callback(event);
                    } catch(ex) {}
                }
            };

            newWindow.removeEventListener = function(name, callback) {
                var that = this,
                    cbListeners = listeners[callback];

                if (!cbListeners || !cbListeners.length) {
                    return;
                }

                switch (name) {
                    case 'loadstart':
                        that.webContents.removeListener('did-start-loading', cbListeners[0]);
                        if (cbListeners.length > 1) {
                            that.webContents.removeListener('did-finish-load', cbListeners[1]);
                        }
                        break;

                    case 'loadstop':
                        that.webContents.removeListener('did-finish-load', cbListeners[0]);
                        break;

                    case 'loaderror':
                        that.webContents.removeListener('did-fail-load', cbListeners[0]);
                        break;

                    case 'exit':
                        that.removeListener('close', cbListeners[0]);
                        break;
                }
            };

            newWindow.executeScript = function(details, callback) {
                var that = this;

                if (details.code) {
                    that.webContents.executeJavaScript(details.code, false, callback);
                } else if (details.file) {
                    $mmFS.readFile(details.file).then(function(code) {
                        that.webContents.executeJavaScript(code, false, callback);
                    }).catch(callback);
                } else {
                    callback('executeScript requires exactly one of code or file to be specified');
                }
            };

            newWindow.insertCSS = function(details, callback) {
                var that = this;

                if (details.code) {
                    that.webContents.insertCSS(details.code);
                    callback();
                } else if (details.file) {
                    $mmFS.readFile(details.file).then(function(code) {
                        that.webContents.insertCSS(code);
                        callback();
                    }).catch(callback);
                } else {
                    callback('insertCSS requires exactly one of code or file to be specified');
                }
            };

            return newWindow;
        };

        return $q.when();
    };

    return self;
});
