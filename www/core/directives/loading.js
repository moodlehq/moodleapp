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
 * Directive to show a loading spinner and message while data is being loaded.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmLoading
 * @description
 * Usage:
 * <mm-loading message="{{loadingMessage}}" hide-until="dataLoaded">
 *     <!-- CONTENT TO HIDE UNTIL LOADED -->
 * </mm-loading>
 * This directive will show a ion-spinner with a message and hide all the content until 'dataLoaded' variable is set to true.
 * If 'message' and 'dynMessage' attributes aren't set, default message "Loading" is shown.
 * 'message' attribute accepts hardcoded strings, variables, filters, etc. E.g. message="{{ 'mm.core.loading' | translate}}".
 *
 * @param {String} [message]           Static message to show while loading. Please use this attribute if the message
 *                                     will always be the same.
 * @param {String} [dynMessage]        Dynamic message to show while loading. Please use this attribute if the message needs
 *                                     to change during execution. Has priority over message.
 * @param {String} hideUntil           Scope variable to determine when should the contents be shown. When the variable is set
 *                                     to true, the loading is hidden and the contents are shown.
 */
.directive('mmLoading', function($translate) {

    return {
        restrict: 'E',
        templateUrl: 'core/templates/loading.html',
        transclude: true,
        scope: {
            hideUntil: '=?',
            message: '@?',
            dynMessage: '=?'
        },
        link: function(scope, element, attrs) {
            if (!attrs.message) {
                // Default loading message.
                $translate('mm.core.loading').then(function(loadingString) {
                    scope.message = loadingString;
                });
            }
        }
    };
});
