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

angular.module('mm.addons.mod_resource')

/**
 * Mod resource prefetch handler.
 *
 * @module mm.addons.mod_resource
 * @ngdoc service
 * @name $mmaModResourcePrefetchHandler
 */
.factory('$mmaModResourcePrefetchHandler', function($mmaModResource, $mmCourse, $mmSite, mmCoreDownloading) {

    var self = {};

    /**
     * Determine the status of a module based on the current status detected.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResourcePrefetchHandler#determineStatus
     * @param {Object} module             Module.
     * @param {String} status             Current status.
     * @param {Boolean} restoreDownloads  True if it should restore downloads if needed.
     * @return {String}                   Module status.
     */
    self.determineStatus = function(module, status, restoreDownloads) {
        if (status == mmCoreDownloading && restoreDownloads) {
            var siteid = $mmSite.getId();
            // Check if the download is being handled.
            if (!$mmaModResource.getDownloadPromise(siteid, module.id)) {
                // Not handled, the app was probably restarted or something weird happened.
                // Re-start download (files already on queue or already downloaded will be skipped).
                $mmaModResource.prefetchContent(module);
            }
        }
        return status;
    };

    /**
     * Get the module status.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResourcePrefetchHandler#getStatus
     * @param  {Object} module        Module.
     * @param {Number} [revision]     Module's revision. If not defined, it will be calculated using module data.
     * @param {Number} [timemodified] Module's timemodified. If not defined, it will be calculated using module data.
     * @return {Promise}              Promise resolved with the status.
     */
    self.getStatus = function(module, revision, timemodified) {
        revision = revision || $mmCourse.getRevisionFromContents(module.contents);
        timemodified = timemodified || $mmCourse.getTimemodifiedFromContents(module.contents);

        return $mmCourse.getModuleStatus($mmSite.getId(), module.id, revision, timemodified).then(function(status) {
            return self.determineStatus(module, status, true);
        });
    };

    /**
     * Whether or not the module is enabled for the site.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResourcePrefetchHandler#isEnabled
     * @return {Boolean}
     */
    self.isEnabled = function() {
        return $mmSite.canDownloadFiles();
    };

    /**
     * Whether or not a file belonging to a mod_resource is downloadable.
     * The file param must have a 'type' attribute like in core_course_get_contents response.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResourcePrefetchHandler#isFileDownloadable
     * @param {Object} file File to check.
     * @return {Boolean}    True if downloadable, false otherwise.
     */
    self.isFileDownloadable = function(file) {
        return $mmaModResource.isFileDownloadable(file);
    };

    /**
     * Prefetch the module.
     *
     * @module mm.addons.mod_resource
     * @ngdoc method
     * @name $mmaModResourcePrefetchHandler#prefetch
     * @param {Object} module The module object returned by WS.
     * @return {Promise}      Promise resolved when all files have been downloaded. Data returned is not reliable.
     */
    self.prefetch = function(module) {
        return $mmaModResource.prefetchContent(module);
    };

    return self;
});
