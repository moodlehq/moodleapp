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

angular.module('mm.addons.mod_lesson', ['mm.core'])

.constant('mmaModLessonComponent', 'mmaModLesson')
.constant('mmaModLessonAutomSyncedEvent', 'mma_mod_lesson_autom_synced')
.constant('mmaModLessonSyncTime', 300000) // In milliseconds.

// Constants used to identify the type of pages and questions.
.constant('mmaModLessonTypeQuestion', 0)
.constant('mmaModLessonTypeStructure', 1)

.config(function($stateProvider) {

    $stateProvider

    .state('site.mod_lesson', {
      url: '/mod_lesson',
      params: {
        module: null,
        courseid: null,
        action: null,
        group: null // Only if action == 'report'.
      },
      views: {
        'site': {
          controller: 'mmaModLessonIndexCtrl',
          templateUrl: 'addons/mod/lesson/templates/index.html'
        }
      }
    })

    .state('site.mod_lesson-player', {
      url: '/mod_lesson-player',
      params: {
        courseid: null,
        lessonid: null,
        pageid: null,
        password: null,
        review: false,
        retake: null // Only if review=true. To verify that the retake can be reviewed.
      },
      views: {
        'site': {
          controller: 'mmaModLessonPlayerCtrl',
          templateUrl: 'addons/mod/lesson/templates/player.html'
        }
      }
    })

    .state('site.mod_lesson-userretake', {
      url: '/mod_lesson-userretake',
      params: {
        courseid: null,
        lessonid: null,
        userid: null,
        retake: null
      },
      views: {
        'site': {
          controller: 'mmaModLessonUserRetakeCtrl',
          templateUrl: 'addons/mod/lesson/templates/userretake.html'
        }
      }
    });

})

.config(function($mmCourseDelegateProvider, $mmCoursePrefetchDelegateProvider, $mmContentLinksDelegateProvider) {
    $mmCourseDelegateProvider.registerContentHandler('mmaModLesson', 'lesson', '$mmaModLessonHandlers.courseContentHandler');
    $mmCoursePrefetchDelegateProvider.registerPrefetchHandler('mmaModLesson', 'lesson', '$mmaModLessonPrefetchHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModLesson:view', '$mmaModLessonHandlers.viewLinksHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModLesson:overview', '$mmaModLessonHandlers.overviewLinksHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModLesson:grade', '$mmaModLessonHandlers.gradeLinksHandler');
})

.run(function($mmCronDelegate) {
    $mmCronDelegate.register('mmaModLesson', '$mmaModLessonHandlers.syncHandler');
});
