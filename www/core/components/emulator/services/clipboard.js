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
 * This service handles the emulation of the clipboard Cordova plugin in desktop apps and in browser.
 *
 * @ngdoc service
 * @name $mmEmulatorClipboard
 * @module mm.core.emulator
 */
.factory('$mmEmulatorClipboard', function($log, $q, $mmApp, $cordovaClipboard) {

    $log = $log.getInstance('$mmEmulatorClipboard');

    var self = {};

    /**
     * Load the emulation of the Cordova plugin. It might not work in some browsers.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorClipboard#load
     * @return {Promise} Promise resolved when done.
     */
    self.load = function() {
        var isDesktop = $mmApp.isDesktop(),
            clipboard,
            copyTextarea;

        if (isDesktop) {
            clipboard = require('electron').clipboard;
        } else {
            // In browser the text must be selected in order to copy it. Create a hidden textarea to put the text in it.
            copyTextarea = document.createElement('textarea');
            angular.element(copyTextarea).addClass('mm-browser-copy-area');
            copyTextarea.setAttribute('aria-hidden', 'true');
            document.body.append(copyTextarea);
        }

        // We need to redefine $cordovaClipboard methods instead of the core plugin (window.cordova.plugins.clipboard)
        // because creating window.cordova breaks the app (it thinks it's a real device).
        $cordovaClipboard.copy = function(text) {
            var deferred = $q.defer();

            if (isDesktop) {
                clipboard.writeText(text);
                deferred.resolve();
            } else {
                // Put the text in the hidden textarea and select it.
                copyTextarea.innerHTML = text;
                copyTextarea.select();

                try {
                    if (document.execCommand('copy')) {
                        deferred.resolve();
                    } else {
                        deferred.reject();
                    }
                } catch (err) {
                    deferred.reject();
                }

                copyTextarea.innerHTML = '';
            }

            return deferred.promise;
        };

        $cordovaClipboard.paste = function() {
            var deferred = $q.defer();

            if (isDesktop) {
                deferred.resolve(clipboard.readText());
            } else {
                // Paste the text in the hidden textarea and get it.
                copyTextarea.innerHTML = '';
                copyTextarea.select();

                try {
                    if (document.execCommand('paste')) {
                        deferred.resolve(copyTextarea.innerHTML);
                    } else {
                        deferred.reject();
                    }
                } catch (err) {
                    deferred.reject();
                }

                copyTextarea.innerHTML = '';
            }

            return deferred.promise;
        };

        return $q.when();
    };

    return self;
});
