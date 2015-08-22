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

.constant('mmaFilesUploadStateName', 'site.files-upload')
.constant('mmaFilesSharedFilesStore', 'shared_files')
.constant('mmaFilesMyComponent', 'mmaFilesMy')
.constant('mmaFilesSiteComponent', 'mmaFilesSite')
.constant('mmaFilesPriority', 200)

.config(function($stateProvider, $mmSideMenuDelegateProvider, mmaFilesUploadStateName, mmaFilesPriority) {

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

        .state(mmaFilesUploadStateName, {
            url: '/upload',
            params: {
                path: false,
                root: false
            },
            views: {
                'site': {
                    controller: 'mmaFilesUploadCtrl',
                    templateUrl: 'addons/files/templates/upload.html'
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

})

.run(function($mmaFiles, $state, $mmSitesManager, $mmUtil, $mmaFilesHelper, $ionicPlatform, $mmApp) {

    // Search for new files shared with the upload (to upload).
    if (ionic.Platform.isIOS()) {
        // In iOS we need to manually check if there are new files in the app Inbox folder.
        function searchToUpload() {
            $mmApp.ready().then(function() {
                $mmaFiles.checkIOSNewFiles().then(function(fileEntry) {
                    $mmSitesManager.getSites().then(function(sites) {
                        if (sites.length == 0) {
                            $mmUtil.showErrorModal('mma.files.errorreceivefilenosites', true);
                        } else if (sites.length == 1) {
                            $mmaFilesHelper.showConfirmAndUploadInSite(fileEntry, sites[0].id);
                        } else {
                            $state.go('site.files-choose-site', {file: fileEntry});
                        }
                    });
                });
            });
        }
        // We want to check it at app start and when the app is resumed.
        $ionicPlatform.on('resume', searchToUpload);
        searchToUpload();
    }

});
