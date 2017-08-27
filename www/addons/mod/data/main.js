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

angular.module('mm.addons.mod_data', ['mm.core'])

.constant('mmaModDataComponent', 'mmaModData')
.constant('mmaModDataEventEntryChanged', 'mma-mod_data_entry_changed')
.constant('mmaModDataPerPage', 25)
.constant('mmaModDataEventAutomSynced', 'mma_mod_data_autom_synced')
.constant('mmaModDataSyncTime', 300000) // In milliseconds.

.config(function($stateProvider) {

    $stateProvider

    .state('site.mod_data', {
        url: '/mod_data',
        params: {
            module: null,
            courseid: null,
            group: null
        },
        views: {
            'site': {
                controller: 'mmaModDataIndexCtrl',
                templateUrl: 'addons/mod/data/templates/index.html'
            }
        }
    })

    .state('site.mod_data-entry', {
        url: '/mod_data-entry',
        params: {
            module: null,
            moduleid: null, // Redundant parameter to fix a problem passing object as parameters. To be fixed in MOBILE-1370.
            courseid: null,
            entryid: null,
            page: null,
            group: null
        },
        views: {
            'site': {
                controller: 'mmaModDataEntryCtrl',
                templateUrl: 'addons/mod/data/templates/entry.html'
            }
        }
    })

    .state('site.mod_data-edit', {
        url: '/mod_data-edit',
        params: {
            module: null,
            moduleid: null, // Redundant parameter to fix a problem passing object as parameters. To be fixed in MOBILE-1370.
            courseid: null,
            entryid: null,
            group: null
        },
        views: {
            'site': {
                controller: 'mmaModDataEditCtrl',
                templateUrl: 'addons/mod/data/templates/edit.html'
            }
        }
    });
})

.config(function($mmCourseDelegateProvider, $mmContentLinksDelegateProvider, $mmCoursePrefetchDelegateProvider) {
    $mmCourseDelegateProvider.registerContentHandler('mmaModData', 'data', '$mmaModDataHandlers.courseContent');
    $mmCoursePrefetchDelegateProvider.registerPrefetchHandler('mmaModData', 'data', '$mmaModDataPrefetchHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModData:index', '$mmaModDataHandlers.indexLinksHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModData:entry', '$mmaModDataHandlers.showEntryLinksHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModData:approve', '$mmaModDataHandlers.approveEntryLinksHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModData:delete', '$mmaModDataHandlers.deleteEntryLinksHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModData:edit', '$mmaModDataHandlers.editEntryLinksHandler');
})

.run(function($mmCronDelegate) {
    // Register sync handler.
    $mmCronDelegate.register('mmaModData', '$mmaModDataHandlers.syncHandler');
});
