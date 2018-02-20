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

angular.module('mm.addons.files', ['mm.core'])

.constant('mmaFilesMyComponent', 'mmaFilesMy')
.constant('mmaFilesSiteComponent', 'mmaFilesSite')
.constant('mmaFilesPriority', 200)

.config(function($stateProvider, $mmSideMenuDelegateProvider, mmaFilesPriority) {

    $stateProvider
        .state('site.files', {
            url: '/files',
            views: {
                'site': {
                    controller: 'mmaFilesIndexController',
                    templateUrl: 'addons/files/templates/index.html'
                }
            }
        })

        .state('site.files-list', {
            url: '/list',
            params: {
                path: false,
                root: false,
                title: false
            },
            views: {
                'site': {
                    controller: 'mmaFilesListController',
                    templateUrl: 'addons/files/templates/list.html'
                }
            }
        })

        .state('site.files-choose-site', {
            url: '/choose-site',
            params: {
                file: null
            },
            views: {
                'site': {
                    controller: 'mmaFilesChooseSiteCtrl',
                    templateUrl: 'addons/files/templates/choosesite.html'
                }
            }
        });

    // Register side menu addon.
    $mmSideMenuDelegateProvider.registerNavHandler('mmaFiles', '$mmaFilesHandlers.sideMenuNav', mmaFilesPriority);

});
