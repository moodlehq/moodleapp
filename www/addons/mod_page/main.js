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

angular.module('mm.addons.mod_page', ['mm.core'])

.constant('mmaModPageComponent', 'mmaModPage')

.config(function($stateProvider) {

    $stateProvider

    .state('site.mod_page', {
      url: '/mod_page',
      params: {
        module: null
      },
      views: {
        'site': {
          controller: 'mmaModPageIndexCtrl',
          templateUrl: 'addons/mod_page/templates/index.html'
        }
      }
    });

})

.run(function($mmCourseDelegate, $mmaModPage, $q, $timeout) {

    function prefetchContent(module) {
        var q = $q.defer();
        $mmaModPage.prefetchContent(module);
        $timeout(function() {
            // Show loading for a short moment.
            q.resolve();
        }, 1500);
        return q.promise;
    }

    $mmCourseDelegate.registerContentHandler('mmaModPage', 'page', function(module) {

        var downloadBtn = {
            hidden: true,
            icon: 'ion-ios-cloud-download',
            callback: function($scope) {
                downloadBtn.hidden = true;
                refreshBtn.hidden = true;
                loadingBtn.hidden = false;
                prefetchContent(module).then(function() {
                    loadingBtn.hidden = true;
                    // Do not show the refresh button after a download.
                });
            }
        };

        var loadingBtn = {
            icon: 'ion-load-c',
            hidden: true,
            callback: function() {
            }
        };

        var refreshBtn = {
            icon: 'ion-android-refresh',
            hidden: true,
            callback: function($scope) {
                downloadBtn.hidden = true;
                refreshBtn.hidden = true;
                loadingBtn.hidden = false;
                $mmaModPage.invalidateContent(module.id).then(function() {
                    prefetchContent(module).then(function() {
                        loadingBtn.hidden = true;
                        // Do not show the refresh button after a refresh.
                    });
                });
            }
        };

        return {
            controller: function($scope) {
                $mmaModPage.hasPrefetchedContent(module.id).then(function() {
                    refreshBtn.hidden = false;
                }, function() {
                    downloadBtn.hidden = false;
                });
            },
            title: module.name,
            state: 'site.mod_page',
            stateParams: { module: module },
            buttons: [
              downloadBtn, loadingBtn, refreshBtn
            ]
        };
    });

});
