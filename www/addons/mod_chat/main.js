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

angular.module('mm.addons.mod_chat', [])

.constant('mmaChatPollInterval', 4000)

.config(function($stateProvider) {

    $stateProvider

    .state('site.mod_chat', {
        url: '/mod_chat',
        params: {
            module: null,
            courseid: null
        },
        views: {
            'site': {
                controller: 'mmaModChatIndexCtrl',
                templateUrl: 'addons/mod_chat/templates/index.html'
            }
        }
    })

    .state('site.mod_chat-chat', {
        url: '/mod_chat-chat',
        params: {
            chatid: null,
            courseid: null,
            title: null
        },
        views: {
            'site': {
                controller: 'mmaModChatChatCtrl',
                templateUrl: 'addons/mod_chat/templates/chat.html'
            }
        }
    });

})

.config(function($mmCourseDelegateProvider) {
    $mmCourseDelegateProvider.registerContentHandler('mmaModChat', 'chat', '$mmaModChatCourseContentHandler');
});