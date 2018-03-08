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

angular.module('mm.core')

/**
 * Helper to store some temporary data for file submission.
 *
 * It uses siteId and component name to index the files.
 * Every component can provide a File area identifier to indentify every file list on the session.
 * This value can be the activity id or a mix of name and numbers.
 *
 * @module mm.core
 * @ngdoc service
 * @name $mmFileSession
 */
.factory('$mmFileSession', function($mmSite) {

    var self = {},
        files = {};

    /**
     * Initializes the filearea to store the file.
     *
     * @param  {String}        component    Component Name.
     * @param  {String|Number} id           File area identifier.
     * @param  {String}        [siteId]     Site ID. If not defined, current site.
     */
    function initFileArea(component, id, siteId) {
        if (!files[siteId]) {
            files[siteId] = {};
        }

        if (!files[siteId][component]) {
            files[siteId][component] = {};
        }

        if (!files[siteId][component][id]) {
            files[siteId][component][id] = [];
        }
    }

    /**
     * Add a file to the session.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFileSession#addFile
     * @param  {String}        component    Component Name.
     * @param  {String|Number} id           File area identifier.
     * @param  {Object}        file         File to add.
     * @param  {String}        [siteId]     Site ID. If not defined, current site.
     * @return {Void}
     */
    self.addFile = function(component, id, file, siteId) {
        siteId = siteId || $mmSite.getId();

        initFileArea(component, id, siteId);

        files[siteId][component][id].push(file);
    };

    /**
     * Clear files stored in session.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFileSession#clearFiles
     * @param  {String}         component    Component Name.
     * @param  {String|Number}  id           File area identifier.
     * @param  {String}         [siteId]     Site ID. If not defined, current site.
     * @return {Void}
     */
    self.clearFiles = function(component, id, siteId) {
        siteId = siteId || $mmSite.getId();
        if (files[siteId] && files[siteId][component] && files[siteId][component][id]) {
            files[siteId][component][id] = [];
        }
    };

    /**
     * Get files stored in session.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFileSession#getFiles
     * @param  {String}         component    Component Name.
     * @param  {String|Number}  id           File area identifier.
     * @param  {String}         [siteId]     Site ID. If not defined, current site.
     * @return {Array}          Array of files in session.
     */
    self.getFiles = function(component, id, siteId) {
        siteId = siteId || $mmSite.getId();
        if (files[siteId] && files[siteId][component] && files[siteId][component][id]) {
            return files[siteId][component][id];
        }
        return [];
    };

    /**
     * Remove a file stored in session.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFileSession#removeFile
     * @param  {String}         component    Component Name.
     * @param  {String|Number}  id           File area identifier.
     * @param  {Object}         file         File to remove. The instance should be exactly the same as the one stored in session.
     * @param  {String}         [siteId]     Site ID. If not defined, current site.
     * @return {Void}
     */
    self.removeFile = function(component, id, file, siteId) {
        siteId = siteId || $mmSite.getId();
        if (files[siteId] && files[siteId][component] && files[siteId][component][id]) {
            var position = files[siteId][component][id].indexOf(file);
            if (position != -1) {
                files[siteId][component][id].splice(position, 1);
            }
        }
    };

    /**
     * Remove a file stored in session.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFileSession#removeFileByIndex
     * @param  {String}         component    Component Name.
     * @param  {String|Number}  id           File area identifier.
     * @param  {Number}         index        Position of the file to remove.
     * @param  {String}         [siteId]     Site ID. If not defined, current site.
     * @return {Void}
     */
    self.removeFileByIndex = function(component, id, index, siteId) {
        siteId = siteId || $mmSite.getId();
        if (files[siteId] && files[siteId][component] && files[siteId][component][id] && index >= 0 &&
                index < files[siteId][component][id].length) {
            files[siteId][component][id].splice(index, 1);
        }
    };

    /**
     * Set a group of files in the session.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFileSession#setFiles
     * @param  {String}         component    Component Name.
     * @param  {String|Number}  id           File area identifier.
     * @param  {Object[]}       newFiles   Files to set.
     * @param  {String}         [siteId]     Site ID. If not defined, current site.
     * @return {Void}
     */
    self.setFiles = function(component, id, newFiles, siteId) {
        siteId = siteId || $mmSite.getId();

        initFileArea(component, id, siteId);

        files[siteId][component][id] = newFiles;
    };

    return self;
});
