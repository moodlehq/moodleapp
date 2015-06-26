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

angular.module('mm.addons.mod_assign', ['mm.core'])

.constant('mmaModAssignComponent', 'mmaModAssign')
.constant('mmaModAssignSubmissionComponent', 'mmaModAssignSubmission')

.config(function($stateProvider) {

    $stateProvider

    .state('site.mod_assign', {
        url: '/mod_assign',
        params: {
            module: null,
            courseid: null
        },
        views: {
            'site': {
                controller: 'mmaModAssignIndexCtrl',
                templateUrl: 'addons/mod_assign/templates/index.html'
            }
        }
    })

    .state('site.mod_assign-submission', {
        url: '/mod_assign-submission',
        params: {
            submission: null
        },
        views: {
            'site': {
                controller: 'mmaModAssignSubmissionCtrl',
                templateUrl: 'addons/mod_assign/templates/submission.html'
            }
        }
    });

})

.config(function($mmCourseDelegateProvider) {
    $mmCourseDelegateProvider.registerContentHandler('mmaModAssign', 'assign', '$mmaModAssignCourseContentHandler');
})

.run(function($mmaModAssign, $mmModuleActionsDelegate) {

    // Add actions to notifications. Forum will only add 1 action: view discussion.
    $mmModuleActionsDelegate.registerModuleHandler('mmaModAssign', function(url, courseid) {

        if (courseid && url.indexOf('/mod/assign/') > -1 && $mmaModAssign.isPluginEnabled()) {
            var matches = url.match(/view\.php\?id=(\d*)/); // Get assignment ID.
            if (matches && typeof matches[1] != 'undefined') {
                var action = {
                    message: 'mm.core.view',
                    icon: 'ion-eye',
                    state: 'site.mod_assign',
                    stateParams: {
                        courseid: courseid,
                        module: {id: matches[1]}
                    }
                };
                return [action]; // Delegate expects an array of actions, a handler can define more than one action.
            }
        }

    });
});
