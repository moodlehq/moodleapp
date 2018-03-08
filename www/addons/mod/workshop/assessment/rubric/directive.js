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

angular.module('mm.addons.mod_workshop')

/**
 * Directive to render workshop assessment strategy rubric.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc directive
 * @name mmaModWorkshopAssessmentStrategyRubric
 */
.directive('mmaModWorkshopAssessmentStrategyRubric', function($mmEvents, mmaModWorkshopAssessmentRefreshedEvent,
        $mmaModWorkshopAssessmentStrategyRubricHandler) {

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/mod/workshop/assessment/rubric/template.html',
        link: function(scope) {
            var obsRefreshed,
                load = function() {
                    if (!scope.assessment || !scope.assessment.form) {
                        return;
                    }

                    var originalValues = $mmaModWorkshopAssessmentStrategyRubricHandler.getOriginalValues(
                            scope.assessment.form, scope.workshopId);
                    if (!scope.selectedValues) {
                        scope.selectedValues = originalValues;
                    }
                };

            load();

            obsRefreshed = $mmEvents.on(mmaModWorkshopAssessmentRefreshedEvent, load);

            scope.$on('$destroy', function() {
                obsRefreshed && obsRefreshed.off && obsRefreshed.off();
            });
        }
    };
});
