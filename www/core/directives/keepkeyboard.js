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
 * Directive to keep the keyboard open when clicking a certain element (usually a button).
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmKeepKeyboard
 * @description
 *
 * This directive needs to be applied to an input or textarea. The value of the directive needs to be a selector
 * to identify the element to listen for clicks (usually a button).
 *
 * When that element is clicked, the input that has this directive will keep the focus if it has it already and the keyboard
 * won't be closed.
 *
 * Example usage:
 *
 * <textarea placeholder="New message" ng-model="newMessage" mm-keep-keyboard="#mma-messages-send-message-button"></textarea>
 * <button id="mma-messages-send-message-button">Send</button>
 */
.directive('mmKeepKeyboard', function($mmUtil, $timeout) {

    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var selector = attrs.mmKeepKeyboard,
                el = element[0],
                lastFocusOut = 0;

            if (typeof selector != 'string' || !selector) {
                // Not a valid selector, stop.
                return;
            }

            var button = document.querySelector(selector);
            if (!button) {
                // Button not found.
                return;
            }

            // Listen for focusout event. This is to be able to check if previous focus was on this element.
            el.addEventListener('focusout', focusOut);

            // Listen for clicks in the button.
            button.addEventListener('click', buttonClicked);

            scope.$on('$destroy', function() {
                // Stop listening.
                button.removeEventListener('click', buttonClicked);
                el.removeEventListener('focusout', focusOut);
            });

            // Input was focused out, save the time it was done.
            function focusOut() {
                lastFocusOut = Date.now();
            }

            // Function called when button is clicked. Focus the input element again if needed.
            function buttonClicked() {
                if (document.activeElement == el) {
                    // Directive's element is focused at the time the button is clicked. Listen for focusout to focus it again.
                    // Focus it after a $timeout just in case the focusout event isn't triggered.
                    el.addEventListener('focusout', focusElementAgain);
                    $timeout(focusElementAgain);
                } else if (document.activeElement == button && Date.now() - lastFocusOut < 200) {
                    // Last focused element was the directive's element, focus it again.
                    $timeout(focusElementAgain);
                }
            }

            // Focus an element again and stop listening focusout to focus again if needed.
            function focusElementAgain() {
                $mmUtil.focusElement(el);
                el.removeEventListener('focusout', focusElementAgain);
            }
        }
    };
});
