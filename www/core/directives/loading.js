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
 * @ngdoc provider
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

    var loading,
        content,
        findLoadingAndContent = function(element) {
            // Seems jqLite doesn't allow selecting by class. Let's search the divs manually.
            var divs = element.find('div');
            for (var i = 0; i < divs.length && (typeof(loading) == 'undefined' || typeof(content) == 'undefined'); i++) {
                var className = divs[i].className;
                if (className.indexOf('mm-loading-container') > -1) {
                    loading = angular.element(divs[i]);
                } else if(className.indexOf('mm-loading-content') > -1) {
                    content = angular.element(divs[i]);
                }
            }
        },
        setMessage = function(element, message) {
            var p = element.find('p');
            for (var i = 0; i < p.length; i++) {
                var className = p[i].className;
                if (className.indexOf('mm-loading-message') > -1) {
                    p[i].innerHTML = message;
                }
            }
        };

    return {
        restrict: 'E',
        templateUrl: 'core/templates/loading.html',
        transclude: true,
        link: function(scope, element, attrs) {
            loading = undefined;
            content = undefined;

            if (attrs.message) {
                setMessage(element, attrs.message);
            } else {
                // Default loading message.
                $translate('mm.core.loading').then(function(loadingString) {
                    setMessage(element, loadingString);
                });
            }

            if (attrs.hideUntil) {
                findLoadingAndContent(element);
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
