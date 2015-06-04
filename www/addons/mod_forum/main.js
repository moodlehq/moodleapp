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

angular.module('mm.addons.mod_forum', [])

.constant('mmaModForumDiscPerPage', 10) // Max of discussions per page.

.config(function($stateProvider) {

    $stateProvider

    .state('site.mod_forum', {
        url: '/mod_forum',
        params: {
            module: null,
            courseid: null
        },
        views: {
            'site': {
                controller: 'mmaModForumDiscussionsCtrl',
                templateUrl: 'addons/mod_forum/templates/discussions.html'
            }
        }
    });

})

.run(function($mmCourseDelegate, $mmaModForum, $mmUtil) {

    $mmCourseDelegate.registerContentHandler('mmaModForum', 'forum', function(module, courseid) {

        if (!$mmaModForum.isPluginEnabled()) {
            return undefined;
        }

        return {
            title: module.name,
            state: 'site.mod_forum',
            stateParams: { module: module, courseid: courseid },
            buttons: []
        };
    });

});
