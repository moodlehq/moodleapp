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

angular.module('mm.addons.userprofilefield_datetime')

/**
 * Directive to render a datetime user profile field.
 *
 * @module mm.addons.userprofilefield_datetime
 * @ngdoc directive
 * @name mmaUserProfileFieldDatetime
 */
.directive('mmaUserProfileFieldDatetime', function($log) {
    $log = $log.getInstance('mmaUserProfileFieldDatetime');

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/userprofilefield/datetime/template.html',
        link: function(scope, element) {
            var field = scope.field,
                year;

            if (field && scope.edit && scope.model) {
                scope.isIOS = ionic.Platform.isIOS();
                field.modelName = 'profile_field_' + field.shortname;

                // Check if it's only date or it has time too.
                field.hasTime = field.param3 && field.param3 !== '0' && field.param3 !== 'false';
                field.inputType = field.hasTime ? 'datetime-local' : 'date';

                // Check min value.
                if (field.param1) {
                    year = parseInt(field.param1, 10);
                    if (year) {
                        field.min = year + '-01-01' + (field.hasTime && !scope.isIOS ? 'T00:00:00' : '');
                    }
                }

                // Check max value.
                if (field.param2) {
                    year = parseInt(field.param2, 10);
                    if (year) {
                        field.max = year + '-12-31' + (field.hasTime&& !scope.isIOS ? 'T23:59:59' : '');
                    }
                }
            }
        }
    };
});
