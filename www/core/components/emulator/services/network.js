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
 * This service handles the emulation of the Cordova Network Information plugin in desktop apps and in browser.
 *
 * @ngdoc service
 * @name $mmEmulatorNetwork
 * @module mm.core.emulator
 */
.factory('$mmEmulatorNetwork', function($log, $q) {

    $log = $log.getInstance('$mmEmulatorNetwork');

    var self = {};

    /**
     * Load the emulation of the Cordova plugin.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorNetwork#load
     * @return {Promise} Promise resolved when done.
     */
    self.load = function() {

        window.Connection = {
            UNKNOWN: 'unknown',
            ETHERNET: 'ethernet',
            WIFI: 'wifi',
            CELL_2G: '2g',
            CELL_3G: '3g',
            CELL_4G: '4g',
            CELL: 'cellular',
            NONE: 'none'
        };

        return $q.when();
    };

    return self;
});
