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

angular.module('mm.addons.url', ['mm.core'])

.config(function($stateProvider) {

    $stateProvider

    .state('site.url', {
      url: '/url',
      params: {
        module: null
      },
      views: {
        'site': {
          controller: 'mmaUrlIndexCtrl',
          templateUrl: 'addons/url/templates/index.html'
        }
      }
    });

})

.run(function($mmCourseDelegate) {

    $mmCourseDelegate.registerContentHandler('mmaUrl', 'url', function(module) {
        var buttons = [];
        if (module.contents && module.contents[0] && module.contents[0].fileurl) {
            buttons.push({
                icon: 'ion-link',
                callback: function() {
                    window.open(module.contents[0].fileurl, '_system');
                }
            });
        }

        return {
            title: module.name,
            state: 'site.url',
            stateParams: { module: module },
            buttons: buttons
        };
    });

});
