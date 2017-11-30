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

angular.module('mm.core.sharedfiles', ['mm.core'])

.constant('mmSharedFilesFolder', 'sharedfiles')
.constant('mmSharedFilesStore', 'shared_files')
.constant('mmSharedFilesEventFileShared', 'file_shared')
.constant('mmSharedFilesPickerPriority', 1300)

.config(function($stateProvider, $mmFileUploaderDelegateProvider, mmSharedFilesPickerPriority) {

    var chooseSiteState = {
            url: '/sharedfiles-choose-site',
            params: {
                filepath: null // Relative path to the file.
            }
        },
        chooseSiteView = {
            controller: 'mmSharedFilesChooseSiteCtrl',
            templateUrl: 'core/components/sharedfiles/templates/choosesite.html'
        };

    $stateProvider

    .state('site.sharedfiles-choose-site', angular.extend(angular.copy(chooseSiteState), {
        views: {
            'site': chooseSiteView
        }
    }))

    .state('mm_login.sharedfiles-choose-site', angular.extend(angular.copy(chooseSiteState), chooseSiteView))

    .state('site.sharedfiles-list', {
        url: '/sharedfiles-list',
        params: {
            path: null,
            manage: false,
            pick: false
        },
        views: {
            'site': {
                templateUrl: 'core/components/sharedfiles/templates/list.html',
                controller: 'mmSharedFilesListCtrl'
            }
        }
    });

    $mmFileUploaderDelegateProvider.registerHandler('mmSharedFiles',
                '$mmSharedFilesHandlers.filePicker', mmSharedFilesPickerPriority);
})

.run(function($mmSharedFilesHelper, $ionicPlatform) {

    if (ionic.Platform.isIOS()) {
        // We want to check it at app start and when the app is resumed.
        $ionicPlatform.on('resume', $mmSharedFilesHelper.searchIOSNewSharedFiles);
        $mmSharedFilesHelper.searchIOSNewSharedFiles();
    }

});
