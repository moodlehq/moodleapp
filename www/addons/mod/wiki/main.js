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

angular.module('mm.addons.mod_wiki', [])

.constant('mmaModWikiSubwikiPagesLoaded', 'mma_mod_wiki_subwiki_pages_loaded')
.constant('mmaModWikiPageCreatedEvent', 'mma_mod_wiki_page_created')
.constant('mmaModWikiManualSyncedEvent', 'mma_mod_wiki_manual_synced')
.constant('mmaModWikiSubwikiAutomSyncedEvent', 'mma_mod_wiki_subwiki_autom_synced')
.constant('mmaModWikiComponent', 'mmaModWiki')
// Renew Lock Timeout in seconds.
.constant('mmaModWikiRenewLockTimeout', 30)
.constant('mmaModWikiSyncTime', 300000) // In milliseconds.

.config(function($stateProvider) {

    $stateProvider

    .state('site.mod_wiki', {
        url: '/mod_wiki',
        params: {
            module: null,
            moduleid: null, // Redundant parameter to fix a problem passing object as parameters. To be fixed in MOBILE-1370.
            courseid: null,
            pageid: null,
            pagetitle: null,
            wikiid: null,
            subwikiid: null,
            userid: null,
            groupid: null,
            action: null
        },
        views: {
            'site': {
                controller: 'mmaModWikiIndexCtrl',
                templateUrl: 'addons/mod/wiki/templates/index.html'
            }
        }
    })

    .state('site.mod_wiki-edit', {
        url: '/mod_wiki-edit',
        params: {
            module: null,
            courseid: null,
            pageid: null,
            pagetitle: null,
            subwikiid: null,
            wikiid: null,
            userid: null,
            groupid: null,
            section: null
        },
        views: {
            'site': {
                controller: 'mmaModWikiEditCtrl',
                templateUrl: 'addons/mod/wiki/templates/edit.html'
            }
        }
    });

})

.config(function($mmCourseDelegateProvider, $mmContentLinksDelegateProvider, $mmCoursePrefetchDelegateProvider) {
    $mmCourseDelegateProvider.registerContentHandler('mmaModWiki', 'wiki', '$mmaModWikiHandlers.courseContent');
    $mmCoursePrefetchDelegateProvider.registerPrefetchHandler('mmaModWiki', 'wiki', '$mmaModWikiPrefetchHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModWiki:index', '$mmaModWikiHandlers.indexLinksHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModWiki:pagemap', '$mmaModWikiHandlers.pageMapLinksHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModWiki:create', '$mmaModWikiHandlers.createLinksHandler');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModWiki:edit', '$mmaModWikiHandlers.editLinksHandler');
})

.run(function($mmEvents, mmCoreEventLogout, $mmaModWiki, $mmCronDelegate) {
    // Clear cache for SubwikiLists
    $mmEvents.on(mmCoreEventLogout, $mmaModWiki.clearSubwikiList);
    // Register sync handler.
    $mmCronDelegate.register('mmaModWiki', '$mmaModWikiHandlers.syncHandler');
});
