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

angular.module('mm.addons.mod_feedback', ["chart.js"])

.constant('mmaModFeedbackComponent', 'mmaModFeedback')
.constant('mmaModFeedbackEventFormSubmitted', 'mma_mod_feedback_form_submitted')

.config(function($stateProvider) {

    $stateProvider

    .state('site.mod_feedback', {
        url: '/mod_feedback',
        params: {
            module: null,
            moduleid: null, // Redundant parameter to fix a problem passing object as parameters. To be fixed in MOBILE-1370.
            courseid: null
        },
        views: {
            'site': {
                controller: 'mmaModFeedbackIndexCtrl',
                templateUrl: 'addons/mod/feedback/templates/index.html'
            }
        }
    })

    .state('site.mod_feedback-form', {
        url: '/mod_feedback-form',
        params: {
            page: null,
            preview: null,
            courseid: null,
            module: null,
            moduleid: null // Redundant parameter to fix a problem passing object as parameters. To be fixed in MOBILE-1370.
        },
        views: {
            'site': {
                controller: 'mmaModFeedbackFormCtrl',
                templateUrl: 'addons/mod/feedback/templates/form.html'
            }
        }
    })

    .state('site.mod_feedback-analysis', {
        url: '/mod_feedback-analysis',
        params: {
            feedbackid: null,
            courseid: null,
            module: null,
            moduleid: null // Redundant parameter to fix a problem passing object as parameters. To be fixed in MOBILE-1370.
        },
        views: {
            'site': {
                controller: 'mmaModFeedbackAnalysisCtrl',
                templateUrl: 'addons/mod/feedback/templates/analysis.html'
            }
        }
    })

    .state('site.mod_feedback-respondents', {
        url: '/mod_feedback-respondents',
        params: {
            courseid: null,
            module: null,
            moduleid: null // Redundant parameter to fix a problem passing object as parameters. To be fixed in MOBILE-1370.
        },
        views: {
            'site': {
                controller: 'mmaModFeedbackRespondentsCtrl',
                templateUrl: 'addons/mod/feedback/templates/respondents.html'
            }
        }
    })

    .state('site.mod_feedback-attempt', {
        url: '/mod_feedback-attempt',
        params: {
            attempt: null,
            attemptid: null, // Redundant parameter to fix a problem passing object as parameters. To be fixed in MOBILE-1370.
            feedbackid: null,
            moduleid: null
        },
        views: {
            'site': {
                controller: 'mmaModFeedbackAttemptCtrl',
                templateUrl: 'addons/mod/feedback/templates/attempt.html'
            }
        }
    });
})

.config(function($mmCourseDelegateProvider, $mmContentLinksDelegateProvider, $mmCoursePrefetchDelegateProvider) {
    $mmCourseDelegateProvider.registerContentHandler('mmaModFeedback', 'feedback', '$mmaModFeedbackHandlers.courseContent');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModFeedback:index', '$mmaModFeedbackHandlers.indexLinksHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModFeedback:analysis', '$mmaModFeedbackHandlers.analysisLinksHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModFeedback:complete', '$mmaModFeedbackHandlers.completeLinksHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModFeedback:print', '$mmaModFeedbackHandlers.printLinksHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModFeedback:showEntries', '$mmaModFeedbackHandlers.showEntriesLinksHandler');
    $mmCoursePrefetchDelegateProvider.registerPrefetchHandler('mmaModFeedback', 'feedback', '$mmaModFeedbackPrefetchHandler');
});
