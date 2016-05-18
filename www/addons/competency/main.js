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

angular.module('mm.addons.competency', [])

.constant('mmaCompetencyPriority', 900)
.constant('mmaCourseCompetenciesPriority', 700)
.constant('mmaCompetencyStatusDraft', 0)
.constant('mmaCompetencyStatusActive', 1)
.constant('mmaCompetencyStatusComplete', 2)
.constant('mmaCompetencyStatusWaitingForReview', 3)
.constant('mmaCompetencyStatusInReview', 4)
.constant('mmaCompetencyReviewStatusIdle', 0)
.constant('mmaCompetencyReviewStatusWaitingForReview', 1)
.constant('mmaCompetencyReviewStatusInReview', 2)

.config(function($stateProvider, $mmSideMenuDelegateProvider, $mmCoursesDelegateProvider, $mmUserDelegateProvider,
    mmaCompetencyPriority, mmaCourseCompetenciesPriority) {

    $stateProvider
        .state('site.learningplans', {
            url: '/learningplans',
            params: {
                userid: null
            },
            views: {
                'site': {
                    controller: 'mmaLearningPlansListCtrl',
                    templateUrl: 'addons/competency/templates/planlist.html'
                }
            }
        })

        .state('site.learningplan', {
            url: '/learningplan',
            params: {
                id: null
            },
            views: {
                'site': {
                    controller: 'mmaLearningPlanCtrl',
                    templateUrl: 'addons/competency/templates/plan.html'
                }
            }
        })

        .state('site.competencies', {
            url: '/competencies',
            params: {
                pid: null, // Not naming it planid because it collides with 'site.competency' param in split-view.
                cid: null, // Not naming it courseid because it collides with 'site.competency' param in split-view.
                compid: null, // Not naming it competencyid because it collides with 'site.competency' param in split-view.
                uid: null // Not naming it userid because it collides with 'site.competency' param in split-view.
            },
            views: {
                'site': {
                    controller: 'mmaCompetenciesListCtrl',
                    templateUrl: 'addons/competency/templates/competencies.html'
                }
            }
        })

        .state('site.competency', {
            url: '/competency',
            params: {
                planid: null,
                courseid: null,
                competencyid: null,
                userid: null
            },
            views: {
                'site': {
                    controller: 'mmaCompetencyCtrl',
                    templateUrl: 'addons/competency/templates/competency.html'
                }
            }
        })

        .state('site.coursecompetencies', {
            url: '/coursecompetencies',
            params: {
                courseid: null,
                userid: null
            },
            views: {
                'site': {
                    controller: 'mmaCourseCompetenciesCtrl',
                    templateUrl: 'addons/competency/templates/coursecompetencies.html'
                }
            }
        })

        .state('site.competencysummary', {
            url: '/competencysummary',
            params: {
                competencyid: null
            },
            views: {
                'site': {
                    controller: 'mmaCompetencySummaryCtrl',
                    templateUrl: 'addons/competency/templates/competencysummary.html'
                }
            }
        });


    // Register side menu addon.
    $mmSideMenuDelegateProvider.registerNavHandler('mmaCompetency', '$mmaCompetencyHandlers.sideMenuNav', mmaCompetencyPriority);

    // Register courses handler.
    $mmCoursesDelegateProvider.registerNavHandler('mmaCompetency', '$mmaCompetencyHandlers.coursesNav',
        mmaCourseCompetenciesPriority);

    // Register user profile addons.
    $mmUserDelegateProvider.registerProfileHandler('mmaCompetency:learningPlan', '$mmaCompetencyHandlers.learningPlan',
        mmaCompetencyPriority);
});