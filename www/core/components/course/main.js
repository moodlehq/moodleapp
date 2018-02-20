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

angular.module('mm.core.course', ['mm.core.courses'])

.constant('mmCoreCoursePriority', 800)
.constant('mmCoreCourseAllSectionsId', -1)

.config(function($stateProvider) {

    $stateProvider

    .state('site.mm_course', {
        url: '/mm_course',
        params: {
            courseid: null,
            sid: null, // Section to load. Not naming it sectionid because it collides with 'mm_course-section' param in split-view.
            sectionnumber: null, // Section to load. If sid is provided there is no need to provide sectionnumber and vice versa.
            moduleid: null, // Module to load.
            course: null
        },
        views: {
            'site': {
                templateUrl: 'core/components/course/templates/sections.html',
                controller: 'mmCourseSectionsCtrl'
            }
        }
    })

    .state('site.mm_course-section', {
        url: '/mm_course-section',
        params: {
            sectionid: null,
            cid: null, // Not naming it courseid because it collides with 'site.mm_course' param in split-view.
            mid: null // Not naming it moduleid because it collides with 'site.mm_course' param in split-view.
        },
        views: {
            'site': {
                templateUrl: 'core/components/course/templates/section.html',
                controller: 'mmCourseSectionCtrl'
            }
        }
    })

    .state('site.mm_course-modcontent', {
        url: '/mm_course-modcontent',
        params: {
            module: null
        },
        views: {
            site: {
                templateUrl: 'core/components/course/templates/modcontent.html',
                controller: 'mmCourseModContentCtrl'
            }
        }
    });
})

.run(function($mmEvents, mmCoreEventLogin, mmCoreEventSiteUpdated, $mmCourseDelegate, mmCoreEventRemoteAddonsLoaded) {
    $mmEvents.on(mmCoreEventLogin, $mmCourseDelegate.updateContentHandlers);
    $mmEvents.on(mmCoreEventSiteUpdated, $mmCourseDelegate.updateContentHandlers);
    $mmEvents.on(mmCoreEventRemoteAddonsLoaded, $mmCourseDelegate.updateContentHandlers);
});
