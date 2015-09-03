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

angular.module('mm.addons.mod_imscp')

/**
 * Directive to navigate to previous/next item in a IMSCP.
 *
 * @module mm.addons.mod_imscp
 * @ngdoc directive
 * @name mmaModImscpBar
 * @description
 * This directive will show two arrows at the left and right of the screen to navigate to previous/next IMSCP item when clicked.
 * If no previous/next item is defined, that arrow won't be shown. It will also show a button to show module description.
 *
 * @param {String}   previous ID of the previous item.
 * @param {String}   next     ID of the next item.
 * @param {Function} action   Function to call when an arrow is clicked. Will receive as a param the itemId to load.
 */
.directive('mmaModImscpBar', function($ionicModal) {
    return {
        restrict: 'E',
        scope: {
            previous: '=?',
            next: '=?',
            action: '=?',
            description: '=?'
        },
        templateUrl: 'addons/mod_imscp/templates/bar.html',
        link: function(scope) {
            $ionicModal.fromTemplateUrl('addons/mod_imscp/templates/description.html', {
                scope: scope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                scope.showDescription = function() {
                    modal.show();
                };
                scope.closeDescription = function() {
                    modal.hide();
                };
                scope.$on('$destroy', function() {
                    modal.remove();
                });
            });
        }
    };
});
