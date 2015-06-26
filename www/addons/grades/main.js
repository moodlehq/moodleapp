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

angular.module('mm.addons.grades', [])

.config(function($stateProvider) {

    $stateProvider

    .state('site.grades', {
        url: '/grades',
        views: {
            'site': {
                templateUrl: 'addons/grades/templates/table.html',
                controller: 'mmaGradesTableCtrl'
            }
        },
        params: {
            course: null,
            userid: null
        }
    });

})
.run(function($mmCoursesDelegate, $mmSite, $mmaGrades, $mmUserDelegate, $mmaGradesHandlers) {
    // Register plugin on course list.
    $mmCoursesDelegate.registerPlugin('mmaGrades', function() {

        if ($mmaGrades.isPluginEnabled()) {
            return {
                icon: 'ion-stats-bars',
                state: 'site.grades',
                title: 'mma.grades.grades'
            };
        }

        return undefined;
    });

    // Register plugin on user profile.
    $mmUserDelegate.registerPlugin('mmaGrades:viewGrades', $mmaGradesHandlers.viewGrades);
});
