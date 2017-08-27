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

angular.module('mm.addons.mod_survey', [])

.constant('mmaModSurveyComponent', 'mmaModSurvey')
.constant('mmaModSurveyAutomSyncedEvent', 'mma_mod_survey_autom_synced')
.constant('mmaModSurveySyncTime', 300000) // In milliseconds.

.config(function($stateProvider) {

    $stateProvider

    .state('site.mod_survey', {
        url: '/mod_survey',
        params: {
            module: null,
            courseid: null
        },
        views: {
            'site': {
                controller: 'mmaModSurveyIndexCtrl',
                templateUrl: 'addons/mod/survey/templates/index.html'
            }
        }
    });

})

.config(function($mmCourseDelegateProvider, $mmContentLinksDelegateProvider, $mmCoursePrefetchDelegateProvider) {
    $mmCourseDelegateProvider.registerContentHandler('mmaModSurvey', 'survey', '$mmaModSurveyHandlers.courseContent');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModSurvey', '$mmaModSurveyHandlers.linksHandler');
    $mmCoursePrefetchDelegateProvider.registerPrefetchHandler('mmaModSurvey', 'survey', '$mmaModSurveyPrefetchHandler');
})

.run(function($mmCronDelegate) {
    $mmCronDelegate.register('mmaModSurvey', '$mmaModSurveyHandlers.syncHandler');
});
