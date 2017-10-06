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
 * Directive to render workshop assessment strategy accumulative.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc directive
 * @name mmaModWorkshopAssessmentStrategyAccumulative
 */
.directive('mmaModWorkshopAssessmentStrategyAccumulative', function($translate, $mmGradesHelper, $mmEvents,
        mmaModWorkshopAssessmentRefreshedEvent) {

    return {
        restrict: 'A',
        priority: 100,
        templateUrl: 'addons/mod/workshop/assessment/accumulative/template.html',
        link: function(scope) {
            var load = function() {
                if (!scope.assessment || !scope.form) {
                    return;
                }

                angular.forEach(scope.form.fields, function(field, n) {
                    field.dimtitle = $translate.instant('mma.mod_workshop_assessment_accumulative.dimensionnumber',
                        {'$a': field.number});
                    console.error(scope.form.dimensionsinfo[n]);
                    var scale = parseInt(field.grade, 10) < 0 ? scope.form.dimensionsinfo[n].scale : null;

                    $mmGradesHelper.makeGradesMenu(field.grade, scope.workshopId, null, scale).then(function(grades) {
                        field.grades = grades;
                    });

                    if (scope.form.current[n] && scope.form.current[n].grade) {
                        scope.form.current[n].grade = parseInt(scope.form.current[n].grade, 10);
                    }
                });
            };

            load();

            var obsRefreshed = $mmEvents.on(mmaModWorkshopAssessmentRefreshedEvent, load);

            scope.$on('$destroy', function() {
                obsRefreshed && obsRefreshed.off && obsRefreshed.off();
            });
        }
    };
});
