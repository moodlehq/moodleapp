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

angular.module('mm.addons.mod_glossary', ['mm.core'])

.constant('mmaModGlossaryComponent', 'mmaModGlossary')
.constant('mmaModGlossaryLimitEntriesNum', 25)

.config(function($stateProvider) {

    $stateProvider

    .state('site.mod_glossary', {
      url: '/mod_glossary',
      params: {
        module: null,
        courseid: null
      },
      views: {
        'site': {
          controller: 'mmaModGlossaryIndexCtrl',
          templateUrl: 'addons/mod/glossary/templates/index.html'
        }
      }
    })

    .state('site.mod_glossary-entry', {
      url: '/mod_glossary-entry',
      params: {
        cid: null, // Not naming it courseid because it collides with 'site.mod_glossary' param in split-view.
        entry: null,
        entryid: null // Required so Angular ui-router is able to compare states (it doesn't compare object properties).
      },
      views: {
        'site': {
          controller: 'mmaModGlossaryEntryCtrl',
          templateUrl: 'addons/mod/glossary/templates/entry.html'
        }
      }
    });

})

.config(function($mmCourseDelegateProvider, $mmContentLinksDelegateProvider, $mmCoursePrefetchDelegateProvider) {
    $mmCourseDelegateProvider.registerContentHandler('mmaModGlossary', 'glossary', '$mmaModGlossaryHandlers.courseContent');
    $mmContentLinksDelegateProvider.registerLinkHandler('mmaModGlossary', '$mmaModGlossaryHandlers.linksHandler');
    $mmCoursePrefetchDelegateProvider.registerPrefetchHandler('mmaModGlossary', 'glossary', '$mmaModGlossaryPrefetchHandler');
});
