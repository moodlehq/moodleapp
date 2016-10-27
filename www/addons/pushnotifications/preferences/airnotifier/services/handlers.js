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

angular.module('mm.addons.pushnotifications')

/**
 * Airnotifier notification preferences handler.
 *
 * @module mm.addons.pushnotifications
 * @ngdoc service
 * @name $mmaPushNotificationPreferencesAirnotifierHandler
 */
.factory('$mmaPushNotificationPreferencesAirnotifierHandler', function($mmaPushNotificationPreferencesAirnotifier, $state) {

    var self = {};

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc service
     * @name $mmaPushNotificationPreferencesAirnotifierHandler#isEnabled
     * @return {Boolean} True if enabled, false otherwise.
     */
    self.isEnabled = function() {
        return $mmaPushNotificationPreferencesAirnotifier.isEnabled();
    };

    /**
     * Open preferences view.
     *
     * @module mm.addons.pushnotifications
     * @ngdoc service
     * @name $mmaPushNotificationPreferencesAirnotifierHandler#openPreferencesView
     * @return {Void}
     */
    self.openPreferencesView = function(processor) {
        $state.go('site.pushnotifications-airnotifierpreferences', {title: processor.displayname});
    };

    return self;
});
