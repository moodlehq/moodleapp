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
 * Directive to auto focus an element when a view is loaded.
 *
 * You can apply it conditionallity assigning it a boolean value: <input type="text" mm-auto-focus="{{showKeyboard}}">
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmAutoFocus
 */
.directive('mmAutoFocus', function($mmUtil, $timeout) {
    return {
        restrict: 'A',
        link: function(scope, el, attrs) {
            // Wait for transition to finish before auto-focus.
            var unregister = scope.$watch(function() {
                return ionic.transition.isActive;
            }, function(isActive) {
                var showKeyboard = typeof attrs.mmAutoFocus == 'undefined' ||
                    (attrs.mmAutoFocus !== false && attrs.mmAutoFocus !== 'false' && attrs.mmAutoFocus !== '0');

                if (!isActive && showKeyboard) {
                    // Enable keyboard. This is needed because Ionic doesn't listen for keyboard events until the user taps.
                    // Calling this will make Ionic listen for keyboard events and resize the view as it should.
                    ionic.keyboard.enable();
                    unregister(); // Stop watching.

                    // Wait a bit before focusing the element. This is because Ionic closes the keyboard on
                    // $ionicView.beforeEnter, and it might take a while to close it.
                    $timeout(function() {
                        $mmUtil.focusElement(el[0]);
                    }, 400);
                }
            });
        }
    };
});
