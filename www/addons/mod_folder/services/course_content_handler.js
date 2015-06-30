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

angular.module('mm.addons.mod_folder')

/**
 * Mod Folder course content handler.
 *
 * @module mm.addons.mod_folder
 * @ngdoc service
 * @name $mmaModFolderCourseContentHandler
 */
.factory('$mmaModFolderCourseContentHandler', function($mmCourse, $mmaModFolder, $state) {
    var self = {};

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_folder
     * @ngdoc method
     * @name $mmaModFolderCourseContentHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return true;
    };

    /**
     * Get the controller.
     *
     * @module mm.addons.mod_folder
     * @ngdoc method
     * @name $mmaModFolderCourseContentHandler#getController
     * @param {Object} module    The module info.
     * @param {Number} courseid  Course ID.
     * @param {Number} sectionid Section ID.
     * @return {Function}
     */
    self.getController = function(module, courseid, sectionid) {
        return function($scope) {
            $scope.icon = $mmCourse.getModuleIconSrc('folder');
            $scope.title = module.name;
            $scope.action = function(e) {
                $state.go('site.mod_folder', {module: module, courseid: courseid, sectionid: sectionid});
            };
        };
    };

    return self;
});
