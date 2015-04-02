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

angular.module('mm.core.courses', [])

.config(function($stateProvider) {

    $stateProvider

    .state('site.index', {
        url: '/index',
        views: {
            'site': {
                templateUrl: 'core/components/courses/templates/courselist.html',
                controller: 'mmCourseListCtrl'
            }
        },
        resolve: {
            courses: function($q, $mmCourses, $mmUtil, $translate) {
                $translate('loading').then(function(loadingString) {
                    $mmUtil.showModalLoading(loadingString);
                });

                return $mmCourses.getUserCourses().then(function(courses) {
                    $mmUtil.closeModalLoading();
                    return courses;
                }, function(error) {
                    $mmUtil.closeModalLoading();
                    if (typeof(error) !== 'undefined' && error != '') {
                        $mmUtil.showErrorModal(error);
                    } else {
                        $mmUtil.showErrorModal('mm.core.courses.errorloadcourses', true);
                    }
                    return $q.reject();
                });
            }
        }
    });

});
