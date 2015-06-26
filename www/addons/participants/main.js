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

angular.module('mm.addons.participants', [])

.constant('mmaParticipantsListLimit', 50) // Max of participants to retrieve in each WS call.

.config(function($stateProvider) {

    $stateProvider
        .state('site.participants', {
            url: '/participants',
            views: {
                'site': {
                    controller: 'mmaParticipantsListCtrl',
                    templateUrl: 'addons/participants/templates/list.html'
                }
            },
            params: {
                course: null
            }
        });

})

.run(function($mmCoursesDelegate) {
    $mmCoursesDelegate.registerPlugin('mmaParticipants', function() {
        return {
            icon: 'ion-person-stalker',
            title: 'mma.participants.participants',
            state: 'site.participants'
        };
    });
});
