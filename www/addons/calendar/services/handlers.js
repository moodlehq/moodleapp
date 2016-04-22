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

angular.module('mm.addons.calendar')

/**
 * Calendar handlers factory.
 *
 * This factory holds the different handlers used for delegates.
 *
 * @module mm.addons.calendar
 * @ngdoc service
 * @name $mmaCalendarHandlers
 */
.factory('$mmaCalendarHandlers', function($log, $mmaCalendar) {
    $log = $log.getInstance('$mmaCalendarHandlers');

    var self = {};

    /**
     * Side menu nav handler.
     *
     * @module mm.addons.calendar
     * @ngdoc method
     * @name $mmaCalendarHandlers#sideMenuNav
     */
    self.sideMenuNav = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmaCalendar.isAvailable();
        };

        /**
         * Get the controller.
         *
         * @return {Object} Controller.
         */
        self.getController = function() {

            /**
             * Side menu nav handler controller.
             *
             * @module mm.addons.calendar
             * @ngdoc controller
             * @name $mmaCalendarHandlers#sideMenuNav:controller
             */
            return function($scope) {
                $scope.icon = 'ion-calendar';
                $scope.title = 'mma.calendar.calendarevents';
                $scope.state = 'site.calendar';
                $scope.class = 'mma-calendar-handler';
            };
        };

        return self;
    };

    return self;
});
