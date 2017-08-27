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
 * Directive to allow showing and hiding a password.
 * The input MUST have an id or name to identify it.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmShowPassword
 * @description
 * This directive needs to be applied to the input with the password. Example:
 *
 * <input id="user-password-input" type="password" placeholder="Password" mm-show-password initial-shown="true">
 *
 * @param {Boolean} [initialShown] Whether the password should be shown initially. Defaults to false.
 */
.directive('mmShowPassword', function($compile) {

    var buttonHtml = '<a class="button button-clear icon" aria-label="{{ label | translate }}" ' +
                        'ng-class="{\'ion-eye\': !shown, \'ion-eye-disabled\': shown}" ng-click="toggle()" ' +
                        'mm-keep-keyboard="{{selector}}" keep-in-button="true"></a>';

    return {
        restrict: 'A',
        scope: true,
        link: function(scope, element, attrs) {
            var button;

            // Create a selector to identify the current element.
            if (element[0].id) {
                scope.selector = '#' + element[0].id;
            } else if (element[0].name) {
                scope.selector = element[0].tagName.toLowerCase() + '[name="' + elm[0].name + '"]';
            } else {
                scope.selector = '';
            }

            button = $compile(angular.element(buttonHtml))(scope);

            // Wrap the element in a div and add the button.
            element.wrap('<div class="item-input-inset mm-show-password-container">');
            element.after(button);

            // By default, don't autocapitalize and autocorrect.
            if (!element.attr('autocorrect')) {
                element.attr('autocorrect', 'off');
            }
            if (!element.attr('autocapitalize')) {
                element.attr('autocapitalize', 'none');
            }

            scope.shown = attrs.initialShown && attrs.initialShown !== 'false';
            setData();

            scope.toggle = function() {
                scope.shown = !scope.shown;
                setData();
            };

            function setData() {
                scope.label = scope.shown ? 'mm.core.hide' : 'mm.core.show';
                element[0].type = scope.shown ? 'text' : 'password';
            }
        }
    };
});
