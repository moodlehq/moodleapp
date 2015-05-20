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

.config(function($stateProvider, mmaFilesUploadStateName) {

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
      });

})

.run(function($mmSideMenuDelegate, $translate, $q, $mmaFiles) {
  var promises = [$translate('mma.files.myfiles')];
  $q.all(promises).then(function(data) {
    var strMyfiles = data[0];
    $mmSideMenuDelegate.registerPlugin('mmaFiles', function() {
      if (!$mmaFiles.isPluginEnabled()) {
        return undefined;
      }
      return {
        icon: 'ion-folder',
        title: strMyfiles,
        state: 'site.files'
      };
    });
  });

});
