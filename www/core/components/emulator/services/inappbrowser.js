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
.factory('$mmEmulatorInAppBrowser', function($log, $q, $mmFS, $window, $mmApp) {

    $log = $log.getInstance('$mmEmulatorInAppBrowser');

    var self = {};

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
                listeners = {};

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

            // Add the missing functions that InAppBrowser supports but BrowserWindow doesn't.
            newWindow.addEventListener = function(name, callback) {
                var that = this;

                switch (name) {
                    case 'loadstart':
                        that.webContents.addListener('did-start-loading', received);
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

                // Store the received function instance to be able to remove the listener.
                listeners[callback] = received;

                function received(event) {
                    try {
                        event.url = that.getURL();
                        callback(event);
                    } catch(ex) {}
                }
            };

            newWindow.removeEventListener = function(name, callback) {
                var that = this,
                    listener = listeners[callback];

                switch (name) {
                    case 'loadstart':
                        that.webContents.removeListener('did-start-loading', listener);
                        break;

                    case 'loadstop':
                        that.webContents.removeListener('did-finish-load', listener);
                        break;

                    case 'loaderror':
                        that.webContents.removeListener('did-fail-load', listener);
                        break;

                    case 'exit':
                        that.removeListener('close', listener);
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
