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

angular.module('mm.addons.mod_resource')

/**
 * Directive to open a link in external browser.
 *
 * @module mm.addons.mod_resource
 * @ngdoc directive
 * @name mmaModResourceHtmlLink
 *
 * @deprecated since version 2.10
 * This function was used to show resources inline
 */
.directive('mmaModResourceHtmlLink', function() {
    return {
        restrict: 'A',
        priority: 99,   // Must be lower than mm-browser, or anything listening for a click event.
        link: function(scope, element, attrs) {
            element.on('click', function(event) {
                var href = element[0].getAttribute('data-href');
                if (!href) {
                    return;
                }

                // Prevent any other directive from catching the event.
                event.stopImmediatePropagation();
                event.preventDefault();

                // Notify the scope which must handle this click, we do not support bubbling.
                scope.$emit('mmaModResourceHtmlLinkClicked', href);
            });
        }
    };
});
