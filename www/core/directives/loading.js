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
 * <mm-loading message="{{loadingMessage}}" hide-until="dataLoaded" loading-padding-top="paddingTop">
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
 * @param {String} [loadingPaddingTop] Padding top to set to loading view. If not set, no padding top is set. This attribute is
 *                                     meant to be used with dynamic paddings (e.g. to move the loading spinner to the user
 *                                     scrollTop). Static padding-top should be set using CSS.
 */
.directive('mmLoading', function($translate) {

    return {
        restrict: 'E',
        templateUrl: 'core/templates/loading.html',
        transclude: true,
        scope: {
            hideUntil: '=?',
            message: '@?',
            dynMessage: '=?',
            loadingPaddingTop: '=?'
        },
        link: function(scope, element, attrs) {
            var el = element[0],
                loading = angular.element(el.querySelector('.mm-loading-container'));

            if (!attrs.message) {
                // Default loading message.
                $translate('mm.core.loading').then(function(loadingString) {
                    scope.message = loadingString;
                });
            }

            if (attrs.loadingPaddingTop) {
                scope.$watch('loadingPaddingTop', function(newValue) {
                    // parseInt of an invalid string is NaN, but parseInt('a') == NaN is FALSE and typeof NaN = 'number'.
                    // That's why we use num >= 0 or num < 0 to check if it's a valid number.
                    var num = parseInt(newValue);
                    if (num >= 0 || num < 0) {
                        loading.css('padding-top', newValue + 'px');
                    } else if(typeof newValue == 'string') {
                        // Maybe they set a value like '200px'.
                        loading.css('padding-top', newValue);
                    }
                });
            }
        }
    };
});
