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

angular.module('mm.addons.mod_choice')

/**
 * Mod forum course content handler.
 *
 * @module mm.addons.mod_forum
 * @ngdoc service
 * @name $mmaModForumCourseContentHandler
 */
.factory('$mmaModChoiceCourseContentHandler', function($mmCourse, $mmaModChoice, $state) {
    var self = {};

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumCourseContentHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmaModChoice.isPluginEnabled();
    };

    /**
     * Get the controller.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumCourseContentHandler#isEnabled
     * @param {Object} module The module info.
     * @param {Number} courseid The course ID.
     * @return {Function}
     */
    self.getController = function(module, courseid) {
        return function($scope) {
            $scope.title = module.name;
            $scope.icon = $mmCourse.getModuleIconSrc('choice');
            $scope.action = function(e) {
                $state.go('site.mod_choice', {module: module, courseid: courseid});
            };
        };
    };

    return self;
});
