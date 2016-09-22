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

angular.module('mm.addons.notes', [])

.constant('mmaNotesPriority', 200)
.constant('mmaNotesAddNotePriority', 200)
.constant('mmaNotesComponent', 'mmaNotes')
.constant('mmaNotesAutomSyncedEvent', 'mma_notes_autom_synced')
.constant('mmaModNotesSyncTime', 300000) // In milliseconds.

.config(function($stateProvider, $mmUserDelegateProvider, $mmCoursesDelegateProvider, mmaNotesPriority, mmaNotesAddNotePriority) {

    $stateProvider

    .state('site.notes-types', {
        url: '/notes-types',
        views: {
            'site': {
                templateUrl: 'addons/notes/templates/types.html',
                controller: 'mmaNotesTypesCtrl'
            }
        },
        params: {
            course: null
        }
    })

    .state('site.notes-list', {
        url: '/notes-list',
        views: {
            'site': {
                templateUrl: 'addons/notes/templates/list.html',
                controller: 'mmaNotesListCtrl'
            }
        },
        params: {
            courseid: null,
            type: null
        }
    });

    // Register plugin on user profile.
    $mmUserDelegateProvider.registerProfileHandler('mmaNotes:addNote', '$mmaNotesHandlers.addNote', mmaNotesAddNotePriority);

    // Register courses handler.
    $mmCoursesDelegateProvider.registerNavHandler('mmaNotes', '$mmaNotesHandlers.coursesNav', mmaNotesPriority);
})

.run(function($mmCronDelegate) {
    // Register sync process.
    $mmCronDelegate.register('mmaNotes', '$mmaNotesHandlers.syncHandler');
});
