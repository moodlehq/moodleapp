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
 * @ngdoc service
 * @name $mmEmulatorManager
 * @module mm.core.emulator
 * @description
 * This service handles the emulation of Cordova plugins in other environments like browser.
 */
.factory('$mmEmulatorManager', function($log, $q, $mmFS, $mmEmulatorClipboard, $mmEmulatorCustomURLScheme, $mmEmulatorFile,
            $mmEmulatorFileTransfer, $mmEmulatorGlobalization, $mmEmulatorInAppBrowser, $mmEmulatorLocalNotifications,
            $mmEmulatorPushNotifications, $mmEmulatorZip, $mmUtil, $mmEmulatorMediaCapture, $mmEmulatorNetwork) {

    $log = $log.getInstance('$mmEmulatorManager');

    var self = {};

    /**
     * Loads HTML API to simulate Cordova APIs. Reserved for core use.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorManager#loadHTMLAPI
     * @return {Promise} Promise resolved when the API is loaded.
     * @protected
     */
    self.loadHTMLAPI = function() {
        if ($mmFS.isAvailable()) {
            $log.debug('Stop loading HTML API, it was already loaded or the environment doesn\'t need it.');
            return $q.when();
        }

        $log.debug('Loading HTML API.');

        var promises = [];

        promises.push($mmEmulatorClipboard.load());
        promises.push($mmEmulatorCustomURLScheme.load());
        promises.push($mmEmulatorFile.load());
        promises.push($mmEmulatorFileTransfer.load());
        promises.push($mmEmulatorGlobalization.load());
        promises.push($mmEmulatorInAppBrowser.load());
        promises.push($mmEmulatorLocalNotifications.load());
        promises.push($mmEmulatorMediaCapture.load());
        promises.push($mmEmulatorPushNotifications.load());
        promises.push($mmEmulatorZip.load());
        promises.push($mmEmulatorNetwork.load());

        return $mmUtil.allPromises(promises);
    };

    return self;
});
