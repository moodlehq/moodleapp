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

.constant('mmaGradesPriority', 400)
.constant('mmaGradesViewGradesPriority', 400)

.config(function($stateProvider, $mmUserDelegateProvider, $mmCoursesDelegateProvider, $mmContentLinksDelegateProvider,
            mmaGradesPriority, mmaGradesViewGradesPriority) {

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
    })

    .state('site.grade', {
        url: '/grade',
        views: {
            'site': {
                templateUrl: 'addons/grades/templates/grade.html',
                controller: 'mmaGradesGradeCtrl'
            }
        },
        params: {
            courseid: null,
            userid: null,
            gradeid: null
        }
    });;


    // Register plugin on user profile.
    $mmUserDelegateProvider.registerProfileHandler('mmaGrades:viewGrades', '$mmaGradesHandlers.viewGrades', mmaGradesViewGradesPriority);

    // Register courses content plugin.
    $mmCoursesDelegateProvider.registerNavHandler('mmaGrades', '$mmaGradesHandlers.coursesNav', mmaGradesPriority);

    // Register content links handler.
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaGrades', '$mmaGradesHandlers.linksHandler');
});
