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
 * This directive adds a "searchbox".
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmSearchbox
 * @description
 * This directive will display an standalone search box with its search button in order to have a better UX.
 *
 * Usage:
 * <mm-searchbox submit-action="search" initial-value="{{searchString}}" search-label="Search" placeholder="Contact name"
 *     autocorrect="off" spellcheck="false" autofocus="true" length-check="3">
 * </mm-searchbox>
 *
 * @param {Function} submitAction   Function to be called when submitting the search form.
 * @param {String}   [initialValue] Initial value for search text, if any. Default empty.
 * @param {String}   [searchLabel]  Label to be used on action button. If not defined, default text will be used.
 * @param {String}   [placeholder]  Placeholder text for search text input. If not defined, default text will be used.
 * @param {String}   [autocorrect]  Enables/disable Autocorrection on search text input. Enabled by default.
 * @param {Boolean}  [spellcheck]   Enables/disable Spellchecker on search text input. Enabled by default.
 * @param {Boolean}  [autofocus]    Enables/disable Autofocus when entering view. Disabled by default.
 * @param {Number}   [lengthCheck]  Check value length before submit. If 0, any string will be submitted. Default: 3.
 */
.directive('mmSearchbox', function($translate, $mmUtil) {
    return {
        restrict: 'E',
        scope: {
            submitAction: '=',
            initialValue: '@?',
            searchLabel: '@?',
            placeholder: '@?',
            autocorrect: '@?',
            spellcheck: '@?',
            autofocus: '@?',
            lengthCheck: '@?'
        },
        templateUrl: 'core/templates/searchbox.html',
        link: function(scope, element) {

            scope.data = {
                value : scope.initialValue ? scope.initialValue : "",
                placeholder: scope.placeholder ? scope.placeholder : $translate.instant('mm.core.search'),
                autocorrect: scope.autocorrect ? scope.autocorrect : 'on',
                spellcheck: scope.spellcheck ? scope.spellcheck : 'true',
                searchLabel: scope.searchLabel ? scope.searchLabel : $translate.instant('mm.core.search'),
                autofocus: scope.autofocus && scope.autofocus != "false",
                lengthCheck: scope.lengthCheck ? scope.lengthCheck : 3
            };

            scope.seachBoxSubmit = function() {
                if (scope.data.value.length < scope.data.lengthCheck) {
                    // The view should handle this case, but adding this check here to document that
                    // we do not want users to query on less than 3 characters as they could retrieve
                    // too many results!
                    return;
                }
                return scope.submitAction(scope.data.value);
            };
        }
    };
});
