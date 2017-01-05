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

angular.module('mm.addons.messageoutput_airnotifier')

/**
 * Airnotifier handlers preferences handler.
 *
 * @module mm.addons.messageoutput_airnotifier
 * @ngdoc service
 * @name $mmaMessageOutputAirnotifierHandlers
 */
.factory('$mmaMessageOutputAirnotifierHandlers', function($mmaMessageOutputAirnotifier, $state) {

    var self = {};

    /**
     * Processor preferences handler.
     *
     * @module mm.addons.messageoutput_airnotifier
     * @ngdoc method
     * @name $mmaMessageOutputAirnotifierHandlers#processorPreferences
     */
    self.processorPreferences = function() {
        var self = {};

        /**
         * Get the language code of the label to show to open the extra preferences.
         *
         * @return {String} Language code.
         */
        self.getPreferenceLabel = function() {
            return 'mma.messageoutput_airnotifier.processorsettingsdesc';
        };

        /**
         * Whether or not the module is enabled for the site.
         *
         * @return {Boolean} True if enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmaMessageOutputAirnotifier.isEnabled();
        };

        /**
         * Open preferences view.
         *
         * @return {Void}
         */
        self.openPreferencesView = function(processor) {
            $state.go('site.messageoutput-airnotifier-preferences', {title: processor.displayname});
        };

        return self;
    };

    return self;
});
