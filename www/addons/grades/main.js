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
.constant('mmaGradesSideMenuPriority', 950)


.config(function($stateProvider, $mmUserDelegateProvider, $mmCoursesDelegateProvider, $mmContentLinksDelegateProvider,
            $mmSideMenuDelegateProvider, mmaGradesPriority, mmaGradesViewGradesPriority, mmaGradesSideMenuPriority) {

    $stateProvider

    .state('site.coursesgrades', {
        url: '/coursesgrades',
        views: {
            'site': {
                templateUrl: 'addons/grades/templates/courses.html',
                controller: 'mmaGradesCoursesGradesCtrl'
            }
        }
    });


    // Register plugin on user profile.
    $mmUserDelegateProvider.registerProfileHandler('mmaGrades:viewGrades', '$mmaGradesHandlers.viewGrades', mmaGradesViewGradesPriority);

    // Register courses content plugin.
    $mmCoursesDelegateProvider.registerNavHandler('mmaGrades', '$mmaGradesHandlers.coursesNav', mmaGradesPriority);

    // Register content links handler.
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaGrades', '$mmaGradesHandlers.linksHandler');

    // Register side menu addon.
    $mmSideMenuDelegateProvider.registerNavHandler('mmaGrades', '$mmaGradesHandlers.sideMenuNav', mmaGradesSideMenuPriority);
});
