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
 * If 'message' attribute is not set, default message "Loading" is shown.
 * 'message' attribute accepts hardcoded strings, variables, filters, etc. E.g. message="{{ 'mm.core.loading' | translate}}".
 */
.directive('mmLoading', function($translate) {

    /**
     * Set message to '.mm-loading-message' element.
     *
     * @param {Object} el      DOM element to search '.mm-loading-message' in.
     * @param {String} message Message to show.
     */
    function setMessage(el, message) {
        var messageEl = angular.element(el.querySelector('.mm-loading-message'));
        if (messageEl) {
            messageEl.html(message);
        }
    }

    return {
        restrict: 'E',
        templateUrl: 'core/templates/loading.html',
        transclude: true,
        link: function(scope, element, attrs) {
            var el = element[0],
                loading,
                content;

            if (attrs.message) {
                setMessage(el, attrs.message);
            } else {
                // Default loading message.
                $translate('mm.core.loading').then(function(loadingString) {
                    setMessage(el, loadingString);
                });
            }

            if (attrs.hideUntil) {
                loading = angular.element(el.querySelector('.mm-loading-container'));
                content = angular.element(el.querySelector('.mm-loading-content'));
                scope.$watch(attrs.hideUntil, function(newValue) {
                    if (newValue) {
                        loading.addClass('hide');
                        content.removeClass('hide');
                    } else {
                        content.addClass('hide');
                        loading.removeClass('hide');
                    }
                });
            }
        }
    };
});
