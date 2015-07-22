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

angular.module('mm.addons.mod_label')

/**
 * Mod label course content handler.
 *
 * @module mm.addons.mod_label
 * @ngdoc service
 * @name $mmaModLabelCourseContentHandler
 */
.factory('$mmaModLabelCourseContentHandler', function($mmText, $translate, $state) {
    var self = {};

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_label
     * @ngdoc method
     * @name $mmaModLabelCourseContentHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return true;
    };

    /**
     * Get the controller.
     *
     * @module mm.addons.mod_label
     * @ngdoc method
     * @name $mmaModLabelCourseContentHandler#isEnabled
     * @param {Object} module The module info.
     * @return {Function}
     */
    self.getController = function(module) {
        return function($scope) {
            var title = $mmText.shortenText($mmText.cleanTags(module.description).trim(), 128);
            if (title.length <= 0) {
                $translate('mma.mod_label.taptoview').then(function(taptoview) {
                    $scope.title = '<span class="mma-mod_label-empty">' + taptoview + '</span>';
                });
            } else {
                $scope.title = title;
            }

            $scope.icon = false;
            $scope.action = function(e) {
                $state.go('site.mod_label', {description: module.description});
            };
        };
    };

    return self;
});
