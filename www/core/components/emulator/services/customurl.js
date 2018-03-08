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
 * This service handles the emulation of the Cordova Custom URL Scheme plugin in desktop apps.
 *
 * @ngdoc service
 * @name $mmEmulatorCustomURLScheme
 * @module mm.core.emulator
 */
.factory('$mmEmulatorCustomURLScheme', function($log, $q, $mmApp) {

    $log = $log.getInstance('$mmEmulatorCustomURLScheme');

    var self = {};

    /**
     * Load the emulation of the Cordova plugin.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorCustomURLScheme#load
     * @return {Promise} Promise resolved when done.
     */
    self.load = function() {
        if (!$mmApp.isDesktop()) {
            return $q.when();
        }

        // Listen for app launched events.
        require('electron').ipcRenderer.on('mmAppLaunched', function(event, url) {
            window.handleOpenURL && window.handleOpenURL(url);
        });

        return $q.when();
    };

    return self;
});
