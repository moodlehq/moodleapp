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

angular.module('mm.addons.mod_scorm')

/**
 * Mod SCORM prefetch handler.
 *
 * @module mm.addons.mod_scorm
 * @ngdoc service
 * @name $mmaModScormPrefetchHandler
 */
.factory('$mmaModScormPrefetchHandler', function($mmaModScorm, mmaModScormComponent) {

    var self = {};

    self.component = mmaModScormComponent;

    /**
     * Get the download size of a module.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#getDownloadSize
     * @param {Object} module   Module to get the size.
     * @param {Number} courseid Course ID the module belongs to.
     * @return {Promise}        Promise resolved with the size.
     */
    self.getDownloadSize = function(module, courseid) {
        return $mmaModScorm.getScorm(courseid, module.id, module.url).then(function(scorm) {
            if ($mmaModScorm.isScormSupported(scorm) !== true) {
                return 0;
            } else if (!scorm.packagesize) {
                // We don't have package size, try to calculate it.
                return $mmaModScorm.calculateScormSize(scorm);
            } else {
                return scorm.packagesize;
            }
        });
    };

    /**
     * Get the list of downloadable files.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#getFiles
     * @param {Object} module   Module to get the files.
     * @param {Number} courseid Course ID the module belongs to.
     * @return {Promise}         Size.
     */
    self.getFiles = function(module, courseid) {
        return $mmaModScorm.getScorm(courseid, module.id, module.url).then(function(scorm) {
            return $mmaModScorm.getScormFileList(scorm);
        }).catch(function() {
            // SCORM not found, return empty list.
            return [];
        });
    };

    /**
     * Get revision of a SCORM (sha1hash).
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#getRevision
     * @param {Object} module   Module to get the revision.
     * @param {Number} courseid Course ID the module belongs to.
     * @return {Number}         Timemodified.
     */
    self.getRevision = function(module, courseid) {
        return $mmaModScorm.getScorm(courseid, module.id, module.url).then(function(scorm) {
            return scorm.sha1hash;
        });
    };

    /**
     * Get timemodified of a SCORM. It always return 0, we don't use timemodified for SCORM packages.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#getTimemodified
     * @param {Object} module   Module to get the timemodified.
     * @param {Number} courseid Course ID the module belongs to.
     * @return {Number}         Timemodified.
     */
    self.getTimemodified = function(module, courseid) {
        return 0;
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmaModScorm.isPluginEnabled();
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_scorm
     * @ngdoc method
     * @name $mmaModScormPrefetchHandler#prefetch
     * @param  {Object} module   The module object returned by WS.
     * @param  {Number} courseId Course ID the module belongs to.
     * @param  {Boolean} single  True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise}         Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module, courseId, single) {
        return $mmaModScorm.getScorm(courseId, module.id, module.url).then(function(scorm) {
            return $mmaModScorm.prefetch(scorm);
        });
    };

    return self;
});
