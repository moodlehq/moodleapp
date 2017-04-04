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

angular.module('mm.core.grades', [])

.constant('mmCoreGradeTypeNone', 0) // Moodle's GRADE_TYPE_NONE.
.constant('mmCoreGradeTypeValue', 1) // Moodle's GRADE_TYPE_VALUE.
.constant('mmCoreGradeTypeScale', 2) // Moodle's GRADE_TYPE_SCALE.
.constant('mmCoreGradeTypeText', 3) // Moodle's GRADE_TYPE_TEXT.

.config(function($stateProvider) {

    $stateProvider

    .state('site.grades', {
        url: '/grades',
        views: {
            'site': {
                templateUrl: 'core/components/grades/templates/table.html',
                controller: 'mmGradesTableCtrl'
            }
        },
        params: {
            course: null,
            userid: null,
            courseid: null,
            forcephoneview: null
        }
    })

    .state('site.grade', {
        url: '/grade',
        views: {
            'site': {
                templateUrl: 'core/components/grades/templates/grade.html',
                controller: 'mmGradesGradeCtrl'
            }
        },
        params: {
            courseid: null,
            userid: null,
            gradeid: null
        }
    });
});
