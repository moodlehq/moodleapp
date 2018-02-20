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

angular.module('mm.addons.mod_data')

/**
 * Directive to render data action.
 *
 * @module mm.addons.mod_data
 * @ngdoc directive
 * @name mmaModDataAction
 */
.directive('mmaModDataAction', function($mmSite, $mmUser, $mmaModDataOffline, $mmEvents, mmaModDataEventEntryChanged) {
    return {
        restrict: 'E',
        priority: 100,
        scope: {
            action: '@',
            database: '=',
            entry: '=?',
            mode: '@'
        },
        templateUrl: 'addons/mod/data/templates/action.html',
        link: function(scope) {
            scope.url = $mmSite.getURL();

            if (scope.action == 'userpicture') {
                $mmUser.getProfile(scope.entry.userid, scope.database.courseid).then(function(profile) {
                    scope.userpicture = profile.profileimageurl;
                });
            }

            scope.undoDelete = function() {
                var dataId = scope.database.id;
                    entryId = scope.entry.id;
                return $mmaModDataOffline.getEntry(dataId, entryId, 'delete').then(function() {
                    // Found. Just delete the action.
                    return $mmaModDataOffline.deleteEntry(dataId, entryId, 'delete');
                }).then(function() {
                    $mmEvents.trigger(mmaModDataEventEntryChanged, {dataId: dataId, entryId: entryId, siteId: $mmSite.getId()});
                });
            };
        }
    };
});
