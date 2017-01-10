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
 * Directive to add a red asterisk for required input fields.
 *
 * @module mm.core
 * @ngdoc directive
 * @name mmMarkRequired
 * @description
 * For forms with required and not required fields, it is recommended to use this directive to mark the required ones.
 *
 * This directive needs to be applied in the label. Example:
 *
 * <ion-label mm-mark-required="{{field.required}}">{{ 'mm.login.username' | translate }}</ion-label>
 */
.directive('mmMarkRequired', function($translate, $timeout) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var mark = attrs.mmMarkRequired && attrs.mmMarkRequired !== 'false' && attrs.mmMarkRequired !== '0',
                requiredLabel = $translate.instant('mm.core.required');

            if (mark) {
                element.append('<i class="icon ion-asterisk mm-input-required-asterisk" title="' + requiredLabel + '"></i>');
                $timeout(function() {
                    var ariaLabel = element.attr('aria-label') || $mmText.cleanTags(element.html(), true);
                    if (ariaLabel) {
                        element.attr('aria-label', ariaLabel + ' ' + requiredLabel);
                    }
                });
            } else {
                var asterisk = element[0].querySelector('.mm-input-required-asterisk');
                if (asterisk) {
                    angular.element(asterisk).remove();
                    $timeout(function() {
                        var ariaLabel = element.attr('aria-label');
                        if (ariaLabel) {
                            element.attr('aria-label', ariaLabel.replace(' ' + requiredLabel, ''));
                        }
                    });
                }
            }
        }
    };
});
