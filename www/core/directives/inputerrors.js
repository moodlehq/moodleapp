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
 * Directive to show errors if an input isn't valid.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmInputErrors
 * @description
 * The purpose of this directive is to make easier and consistent the validation of forms.
 *
 * It needs to be applied to the container of an input element (input, select, ...). For ion-checkbox, it needs to be applied
 * to the ion-checkbox element. It uses ngMessages and angular form validation to check for errors and display the error messages.
 *
 * Please notice that the inputs need to have a name to make it work. Also, this directive has an isolated scope, so if the
 * input is using a dynamic name (e.g. {{fieldname}}) it is mandatory to pass the name using the fieldName attribute.
 *
 * Also, if you want the input to be required, have a minlength, etc. you need to specify it in the input field.
 *
 * Example usages:
 *
 * <ion-input mm-input-errors error-messages="usernameErrors">
 *     <ion-label mm-mark-required>{{ 'mm.login.username' | translate }}</ion-label>
 *     <input type="text" name="username" placeholder="Username" ng-model="data.username" required>
 * </ion-input>
 *
 * <ion-checkbox name="policyagreed" ng-model="data.policyagreed" required="true" mm-input-errors error-messages="policyErrors">
 *     <p mm-mark-required>{{ 'mm.login.policyaccept' | translate }}</p>
 * </ion-checkbox>
 *
 * Accepts the following attributes:
 *
 * @param {String} [fieldName]     The name of the input. If not supplied, the directive will search for it. Please notice that
 *                                 this directive has an isolated scope, so if the input is using a dynamic name (e.g. {{name}})
 *                                 it is mandatory to pass it using this attribute.
 * @param {Object} [errorMessages] Object with the error messages to show in each case. The keys of the object are the error
 *                                 types ("required", "email", "minlength", ...) and the values are the message to show
 *                                 for that error. See angular validation and ngMessages for more info.
 *                                 It is NOT recommended to create dynamic objects in the template for performance reasons and
 *                                 because default error messages will not work with them.
 *                                 NOT recommended:     error-messages="{required: ('mm.login.passwordrequired' | translate)}"
 *                                 Recommended:         error-messages="myErrorsObject"
 */
.directive('mmInputErrors', function($translate, $compile) {
    var errorContainerTemplate =
        '<div class="mm-input-error-container" ng-show="form[fieldName].$error && form.$submitted" ' +
                    'ng-messages="form[fieldName].$error" role="alert">' +
            '<div ng-repeat="(type, text) in errorMessages">' +
                '<div class="mm-input-error" ng-message-exp="type">{{text}}</div>' +
            '</div>' +
        '</div>';

    // Initialize some common errors if needed.
    function initErrorMessages(scope, input) {
        scope.errorMessages = scope.errorMessages || {};

        scope.errorMessages.required = scope.errorMessages.required || $translate.instant('mm.core.required');
        scope.errorMessages.email = scope.errorMessages.email || $translate.instant('mm.login.invalidemail');
        scope.errorMessages.date = scope.errorMessages.date || $translate.instant('mm.login.invaliddate');
        scope.errorMessages.datetime = scope.errorMessages.datetime || $translate.instant('mm.login.invaliddate');
        scope.errorMessages.datetimelocal = scope.errorMessages.datetimelocal || $translate.instant('mm.login.invaliddate');
        scope.errorMessages.time = scope.errorMessages.time || $translate.instant('mm.login.invalidtime');
        scope.errorMessages.url = scope.errorMessages.url || $translate.instant('mm.login.invalidurl');

        angular.forEach(['min', 'max'], function(type) {
            // Initialize min/max errors if needed.
            if (!scope.errorMessages[type]) {
                if (input && typeof input[type] != 'undefined' && input[type] !== '') {
                    var value = input[type];
                    if (input.type == 'date' || input.type == 'datetime' || input.type == 'datetime-local') {
                        var date = moment(value);
                        if (date.isValid()) {
                            value = moment(value).format($translate.instant('mm.core.dfdaymonthyear'));
                        }
                    }

                    scope.errorMessages[type] = $translate.instant('mm.login.invalidvalue' + type, {$a: value});
                } else {
                    scope.errorMessages[type] = $translate.instant('mm.login.profileinvaliddata');
                }
            }
        });
    }

    return {
        restrict: 'A',
        require: '^form',
        scope: {
            fieldName: '@?',
            errorMessages: '=?'
        },
        link: function(scope, element, attrs, FormController) {
            var input;

            scope.form = FormController;

            if (!scope.fieldName) {
                // Search the input element to get its name.
                input = element[0].querySelector('input, select, textarea');
                if (!input || !input.name) {
                    // Field not found or it doesn't have a name, stop.
                    return;
                }

                scope.fieldName = input.name;
            }


            if (input) {
                // Initialize some common errors if needed.
                initErrorMessages(scope, input);
            }

            // Add the error container.
            var errorContainer = $compile(errorContainerTemplate)(scope);
            element.append(errorContainer);

            // Add "mm-input-has-errors" class if an error occurs.
            // ng-class="{ 'mm-input-has-errors' : signupForm.username.$invalid && signupForm.$submitted}">
            scope.$watch('form[fieldName].$invalid && form.$submitted', function(newValue) {
                // Initialize some common errors if needed.
                if (!input) {
                    input = element[0].querySelector('*[name="' + scope.fieldName + '"]');
                    if (input) {
                        initErrorMessages(scope, input);
                    }
                }

                if (newValue) {
                    element.addClass('mm-input-has-errors');
                } else {
                    element.removeClass('mm-input-has-errors');
                }
            });
        }
    };
});
