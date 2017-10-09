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
 * Directive to render a workshop assessment strategy.
 *
 * @module mm.addons.mod_workshop
 * @ngdoc directive
 * @name mmaModWorkshopAssessmentStrategy
 * @description
 * Directive to render feedback plugin.
 *
 * It requires to receive an "assessment" scope variable indicating the strategy to render the form.
 *
 * Parameters received by this directive and shared with the directive to render the plugin (if any):
 *
 * @param {Object}  assessment      The assessment info.
 * @param {String}  strategy        The assessment strategy name.
 * @param {Object}  workshop        The workshop activity data.
 * @param {Object}  access          The access data to the activity.
 *
 */
.directive('mmaModWorkshopAssessmentStrategy', function($compile, $mmaModWorkshop, $mmaModWorkshopAssessmentStrategyDelegate, $q,
        mmaModWorkshopAssessmentInvalidatedEvent, $mmaModWorkshopHelper, $mmEvents, mmaModWorkshopAssessmentRefreshedEvent,
        mmaModWorkshopComponent) {

    function load(scope, assessment, workshopId, refresh) {
         var promises = [];

        if (refresh) {
            promises.push($mmaModWorkshopHelper.getReviewerAssessmentById(workshopId, assessment.id)
                    .then(function(assessmentData) {
                assessment = assessmentData;
                scope.assessment = assessmentData;
            }));
        }

        promises.push($mmaModWorkshop.getAssessmentForm(workshopId, assessment.id)
                .then(function(assessmentForm) {
            scope.form = assessmentForm;
        }));

        return $q.all(promises);
    }

    return {
        restrict: 'E',
        scope: {
            assessment: '=',
            strategy: '=',
            workshop: '=',
            access: '='
        },
        templateUrl: 'addons/mod/workshop/templates/assessmentstrategy.html',
        link: function(scope, element) {

            var assessment = scope.assessment,
                strategy = scope.strategy,
                container = element[0].querySelector('.mma-mod-workshop-assessment-strategy-container'),
                directive,
                obsInvalidated;

            if (!assessment || !container || !strategy) {
                scope.assessmentLoaded = true;
                return;
            }

            scope.feedback = {};
            scope.workshopId = scope.workshop.id;
            scope.overallFeedkback = !!scope.workshop.overallfeedbackmode;
            scope.overallFeedkbackRequired = scope.workshop.overallfeedbackmode == 2;
            scope.component = mmaModWorkshopComponent;
            scope.componentId = scope.workshop.cmid;

            if (scope.access.canallocate) {
                scope.weights = [];
                for (var i = 16; i >= 0; i--) {
                    scope.weights[i] = i;
                }
                 scope.weight = 1;
            }

            // Text changed in first render.
            scope.firstRender = function() {
                scope.feedback.text = scope.assessment.feedbackauthor;
            };

            // Check if the strategy has defined its own directive to render itself.
            directive = $mmaModWorkshopAssessmentStrategyDelegate.getDirectiveForPlugin(strategy);
            if (directive) {
                obsInvalidated = $mmEvents.on(mmaModWorkshopAssessmentInvalidatedEvent, function() {
                    scope.assessmentLoaded = false;
                    // Invalidate and refresh data.
                    var promises = [];
                    promises.push($mmaModWorkshop.invalidateAssessmentFormData(scope.workshopId, assessment.id));
                    promises.push($mmaModWorkshop.invalidateAssessmentData(scope.workshopId, assessment.id));

                    return $q.all(promises).finally(function() {
                        return load(scope, assessment, scope.workshopId, true);
                    }).finally(function() {
                        console.error(scope.assessment, scope.form, scope.workshop, scope.access);
                        $mmEvents.trigger(mmaModWorkshopAssessmentRefreshedEvent);
                    });
                });

                load(scope, assessment, scope.workshopId).then(function() {
                    // Add the directive to the element.
                    container.setAttribute(directive, '');
                    // Compile the new directive.
                    $compile(container)(scope);
                }).finally(function() {
                    console.error(scope.assessment, scope.form, scope.workshop, scope.access);
                    scope.assessmentLoaded = true;
                });
            } else {
                // Helper data and fallback.
                scope.notSupported = !$mmaModWorkshopAssessmentStrategyDelegate.isPluginSupported(strategy);
                scope.assessmentLoaded = true;
            }

            scope.$on('$destroy', function() {
                obsInvalidated && obsInvalidated.off && obsInvalidated.off();
            });
        }
    };
});
